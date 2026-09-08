/**
 * VERIFY AI Service Interface
 * Coordinates On-Device AI inference and Cloud Multimodal AI (Gemini 3.8 Flash).
 * Implements Before -> Action -> After verification tracking and uncertainty handling.
 */

import { DetectedHomeItem, VerificationResult, ItemImportance, VerificationMethod } from '../types';
import { onDeviceAiService } from './onDeviceAiService';

export interface VerifyItemParams {
  itemName: string;
  expectedState: string;
  imageBase64: string;
  room?: string;
  previousState?: string;
  preferOnDevice?: boolean;
}

export interface IAiHomeService {
  analyzeHomePhotos(imagesBase64: string[]): Promise<DetectedHomeItem[]>;
  verifyItemState(params: VerifyItemParams): Promise<VerificationResult>;
}

function inferDefaultImportance(itemName: string, category: string): ItemImportance {
  const name = itemName.toLowerCase();
  if (name.includes('stove') || name.includes('gas') || name.includes('cylinder') || name.includes('iron') || name.includes('heater')) {
    return 'CRITICAL';
  }
  if (name.includes('door') || name.includes('window') || name.includes('lock') || name.includes('entrance') || category === 'SECURITY') {
    return 'HIGH';
  }
  if (name.includes('ac') || name.includes('conditioner') || name.includes('geyser') || name.includes('water') || name.includes('tap') || category === 'ENERGY') {
    return 'MEDIUM';
  }
  return 'LOW';
}

function inferDefaultVerificationMethod(itemName: string): VerificationMethod {
  const name = itemName.toLowerCase();
  if (name.includes('ac') || name.includes('conditioner')) {
    return 'CAMERA_AI'; // Can also be backed by Office Kit Smart Plug
  }
  return 'CAMERA_AI';
}

class HybridAiHomeService implements IAiHomeService {
  /**
   * Analyzes multiple home walk-through images using Gemini 3.8 Flash multimodal API
   */
  async analyzeHomePhotos(imagesBase64: string[]): Promise<DetectedHomeItem[]> {
    if (!imagesBase64 || imagesBase64.length === 0) {
      throw new Error('Please capture or select at least one photo of your home.');
    }

    const response = await fetch('/api/ai/analyze-home', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ images: imagesBase64 }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.items)) {
      throw new Error(data.error || 'Invalid response structure from AI analysis.');
    }

    // Assign stable unique IDs, importance ranking, and reason
    return data.items.map((item: any, index: number) => {
      const objectName = String(item.object || 'Detected Item');
      const category = (['SAFETY', 'ENERGY', 'SECURITY', 'OTHER'].includes(item.category)
        ? item.category
        : 'OTHER') as any;

      const importance = (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(item.importance)
        ? item.importance
        : inferDefaultImportance(objectName, category)) as ItemImportance;

      const method = (['CAMERA_AI', 'SENSOR', 'OFFICE_KIT', 'MANUAL'].includes(item.verification_method)
        ? item.verification_method
        : inferDefaultVerificationMethod(objectName)) as VerificationMethod;

      return {
        id: `detected_${Date.now()}_${index}`,
        object: objectName,
        category,
        room: String(item.room || 'General'),
        recommended_state: String(item.recommended_state || 'OFF').toUpperCase(),
        reason: String(item.reason || 'Verification recommended before leaving home.'),
        importance,
        verification_method: method,
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.9,
        enabled: true,
      };
    });
  }

  /**
   * Verifies an item's current physical state against user's expected state
   * Architecture: Camera -> On-Device AI -> If confident -> Local Result.
   * If complex / safety-critical / low confidence -> Cloud Multimodal AI (Gemini 3.8 Flash)
   */
  async verifyItemState(params: VerifyItemParams): Promise<VerificationResult> {
    const preferOnDevice = params.preferOnDevice !== false;

    // Step 1: Check On-Device AI Candidate
    if (preferOnDevice && onDeviceAiService.isEnabled()) {
      const localResult = await onDeviceAiService.analyzeLocally({
        itemName: params.itemName,
        expectedState: params.expectedState,
        imageBase64: params.imageBase64,
        room: params.room,
      });

      if (localResult.canHandleLocally && localResult.result) {
        // Track Before -> Action -> After transition if previousState provided
        if (params.previousState) {
          localResult.result.stateTransition = {
            before: params.previousState,
            after: localResult.result.detected_state,
            changed: params.previousState !== localResult.result.detected_state,
          };
        }
        return localResult.result;
      }
    }

    // Step 2: Escalate to Cloud Multimodal AI
    const response = await fetch('/api/ai/verify-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itemName: params.itemName,
        expectedState: params.expectedState,
        imageBase64: params.imageBase64,
        room: params.room,
        previousState: params.previousState,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Verification failed with status ${response.status}`);
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Could not parse verification results.');
    }

    const d = result.data;
    const detectedState = String(d.detected_state || 'UNKNOWN').toUpperCase();
    const isLowConfidence = Boolean(d.is_low_confidence || (typeof d.confidence === 'number' && d.confidence < 0.70));
    const verified = Boolean(d.verified) && !isLowConfidence;

    let stateTransition;
    if (params.previousState) {
      stateTransition = {
        before: params.previousState,
        after: detectedState,
        changed: params.previousState !== detectedState,
      };
    }

    return {
      object: d.object || params.itemName,
      detected_state: detectedState,
      expected_state: String(d.expected_state || params.expectedState).toUpperCase(),
      verified,
      confidence: typeof d.confidence === 'number' ? d.confidence : 0.85,
      isLowConfidence,
      engine: 'CLOUD_MULTIMODAL',
      stateTransition,
      message: String(d.message || (verified ? 'Verified matching expected state.' : 'Current state does not match expected state.')),
      timestamp: Date.now(),
      imageThumbnail: params.imageBase64,
    };
  }
}

// Export singleton instance adhering to the interface
export const aiHomeService: IAiHomeService = new HybridAiHomeService();
