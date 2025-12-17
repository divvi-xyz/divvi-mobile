import * as Sentry from '@sentry/react-native'
import { Span } from '@sentry/react-native'
import { SentrySpan, SentrySpans } from 'src/sentry/SentrySpans'

let spans = [] as Array<any>

export const SentrySpanHub = {
  startSpan(name: SentrySpan) {
    Sentry.startSpanManual({ ...SentrySpans[name] }, (span) => {
      spans.push(span)
    })
  },

  finishSpan(name: SentrySpan) {
    // get span operation - 'op'
    const op = SentrySpans[name].op

    // Find first the span with this op.
    const selectedSpan: Span = spans.find((span) => span && span.op === SentrySpans[name].op)

    // Finish the selected span
    selectedSpan?.end()

    // Remove all spans matching op from the span hub
    spans = spans.filter((span) => span && span.op !== op)
  },
}
