export type SlotStatus = 'available' | 'locked' | 'booked';

export interface Slot {
  id: number;
  start_time: string;
  end_time: string;
  status: SlotStatus;
  lockedByMe?: boolean;
}