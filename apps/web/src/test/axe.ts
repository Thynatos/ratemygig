import { axe } from 'vitest-axe'
import type { ElementContext, RunOptions } from 'axe-core'

/**
 * Run axe against a container with color-contrast disabled: jsdom has no
 * layout engine, so the rule tries to read a canvas context and spews
 * "Not implemented: HTMLCanvasElement.prototype.getContext" stderr noise
 * without ever producing useful results.
 */
export function checkA11y(
    context: ElementContext,
    options?: RunOptions
) {
    return axe(context, {
        ...options,
        rules: {
            'color-contrast': { enabled: false },
            ...(options?.rules ?? {}),
        },
    })
}
