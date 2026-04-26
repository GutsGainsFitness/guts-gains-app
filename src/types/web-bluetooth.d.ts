// Minimal Web Bluetooth ambient types (DOM types not in standard TS lib).
// Spec: https://webbluetoothcg.github.io/web-bluetooth/

interface Navigator {
  bluetooth?: {
    requestDevice(options: {
      filters?: Array<{ services?: (string | number)[]; name?: string; namePrefix?: string }>;
      optionalServices?: (string | number)[];
      acceptAllDevices?: boolean;
    }): Promise<BluetoothDevice>;
  };
}

interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
}
