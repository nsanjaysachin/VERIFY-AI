/**
 * VERIFY - iQOO Office Kit Integration Bridge
 * Connects physical hardware signals (Smart Desk Dock, Power Monitor, Contact Sensor)
 * to VERIFY's Context & Verification Engine.
 */

import { OfficeKitDevice, ChecklistItem } from '../types';

export type OfficeKitSignalListener = (device: OfficeKitDevice, affectedItemName?: string) => void;

const INITIAL_DEVICES: OfficeKitDevice[] = [
  {
    id: 'iqoo_power_plug_ac',
    name: 'iQOO Smart Power Monitor (AC)',
    type: 'SMART_PLUG',
    connected: true,
    batteryLevel: 100,
    lastSignalTime: Date.now() - 120000,
    telemetry: {
      powerWatts: 0, // 0 Watts indicates appliance is completely OFF
      ambientTempC: 24.5,
    },
  },
  {
    id: 'iqoo_door_contact',
    name: 'iQOO Magnetic Entry Sensor (Front Door)',
    type: 'DOOR_CONTACT',
    connected: true,
    batteryLevel: 94,
    lastSignalTime: Date.now() - 300000,
    telemetry: {
      contactClosed: true, // Closed & secured
    },
  },
  {
    id: 'iqoo_desk_dock',
    name: 'iQOO Office Desk Stand & Hub',
    type: 'DESK_DOCK',
    connected: false,
    lastSignalTime: Date.now() - 3600000,
    telemetry: {
      docked: false,
    },
  },
];

export class OfficeKitService {
  private devices: OfficeKitDevice[] = INITIAL_DEVICES;
  private listeners: Set<OfficeKitSignalListener> = new Set();

  public getDevices(): OfficeKitDevice[] {
    return [...this.devices];
  }

  public getDeviceById(id: string): OfficeKitDevice | undefined {
    return this.devices.find((d) => d.id === id);
  }

  public subscribe(listener: OfficeKitSignalListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Simulates an incoming physical signal from an iQOO Office Kit device
   */
  public triggerDeviceSignal(deviceId: string, updates: Partial<OfficeKitDevice['telemetry']>): OfficeKitDevice | null {
    const devIndex = this.devices.findIndex((d) => d.id === deviceId);
    if (devIndex === -1) return null;

    const device = this.devices[devIndex];
    device.telemetry = {
      ...device.telemetry,
      ...updates,
    };
    device.lastSignalTime = Date.now();
    device.connected = true;

    let targetItemName: string | undefined;
    if (device.type === 'SMART_PLUG') targetItemName = 'Air Conditioner';
    if (device.type === 'DOOR_CONTACT') targetItemName = 'Main Door';

    this.notify(device, targetItemName);
    return { ...device };
  }

  /**
   * Evaluates if a checklist item can be verified or supplemented via Office Kit hardware
   */
  public evaluateItemWithOfficeKit(item: ChecklistItem): {
    supported: boolean;
    device?: OfficeKitDevice;
    verifiedState?: string;
    isVerified?: boolean;
    reason?: string;
  } {
    const nameLower = item.object.toLowerCase();

    // Check AC with Smart Power Monitor
    if (nameLower.includes('ac') || nameLower.includes('conditioner')) {
      const plug = this.getDeviceById('iqoo_power_plug_ac');
      if (plug && plug.connected && plug.telemetry?.powerWatts !== undefined) {
        const isOff = plug.telemetry.powerWatts < 5;
        return {
          supported: true,
          device: plug,
          verifiedState: isOff ? 'OFF' : 'ON',
          isVerified: item.recommended_state === (isOff ? 'OFF' : 'ON'),
          reason: `iQOO Power Monitor telemetry reports ${plug.telemetry.powerWatts}W draw. ${isOff ? 'Appliance is idle/OFF.' : 'Appliance is actively drawing current.'}`,
        };
      }
    }

    // Check Door with Magnetic Entry Sensor
    if (nameLower.includes('door') || nameLower.includes('entrance')) {
      const sensor = this.getDeviceById('iqoo_door_contact');
      if (sensor && sensor.connected && sensor.telemetry?.contactClosed !== undefined) {
        const isClosed = sensor.telemetry.contactClosed;
        return {
          supported: true,
          device: sensor,
          verifiedState: isClosed ? 'LOCKED' : 'OPEN',
          isVerified: isClosed,
          reason: `iQOO Contact Sensor reports door frame alignment is ${isClosed ? 'CLOSED & SEALED' : 'OPEN / AJAR'}.`,
        };
      }
    }

    return { supported: false };
  }

  private notify(device: OfficeKitDevice, affectedItemName?: string) {
    this.listeners.forEach((cb) => cb(device, affectedItemName));
  }
}

export const officeKitService = new OfficeKitService();
