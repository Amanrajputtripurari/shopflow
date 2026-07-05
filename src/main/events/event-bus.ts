import mitt from 'mitt'

import type { ShopFlowEvent } from '@shared/events'

type EventMap = {
  [K in ShopFlowEvent]: unknown
}

export const eventBus = mitt<EventMap>()
