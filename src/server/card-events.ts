import 'server-only';

type CardEventType =
  | 'profile.updated'
  | 'profile_translation.deleted'
  | 'availability_slot.created'
  | 'availability_slot.updated'
  | 'availability_slot.deleted'
  | 'exception.created'
  | 'exception.deleted'
  | 'consultation_request.created'
  | 'consultation_request.updated'
  | 'consultation_request.status_updated';

export type CardEvent = {
  id: string;
  type: CardEventType;
  createdAt: string;
  payload?: Record<string, unknown>;
};

type Listener = (event: CardEvent) => void;

const listeners = new Set<Listener>();

export function publishCardEvent(
  type: CardEventType,
  payload?: Record<string, unknown>
) {
  const event: CardEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    createdAt: new Date().toISOString(),
    payload
  };

  for (const listener of listeners) {
    listener(event);
  }
}

export function subscribeToCardEvents(listener: Listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
