/*
    Copyright (c) 2023 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { css } from "../base/dom/css";
import { html, CustomElement } from "../base/dom/custom-element";

export class KCUIFilteredListElement extends CustomElement {
    static override styles = css`
        :host {
            display: contents;
        }
    `;

    override render(): Element | DocumentFragment {
        return html`<slot></slot>`;
    }

    #filter_text: string | null;

    set filter_text(v) {
        this.#filter_text = v?.toLowerCase() ?? null;
        this.apply_filter();
    }

    get filter_text() {
        return this.#filter_text;
    }

    private get item_selector() {
        return this.getAttribute("item-selector") ?? "[data-match-text]";
    }

    private *items() {
        for (const parent of this.queryAssignedElements()) {
            yield* parent.querySelectorAll<HTMLElement>(this.item_selector);
        }
    }

    private apply_filter() {
        // don't block the main thread
        window.requestAnimationFrame(() => {
            for (const el of this.items()) {
                if (
                    this.#filter_text == null ||
                    el.dataset["matchText"]
                        ?.toLowerCase()
                        .includes(this.#filter_text)
                ) {
                    el.style.removeProperty("display");
                } else {
                    el.style.display = "none";
                }
            }
        });
    }
}

window.customElements.define("kc-ui-filtered-list", KCUIFilteredListElement);
