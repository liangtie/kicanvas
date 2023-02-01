/*
    Copyright (c) 2022 Alethea Katherine Flowers.
    Published under the standard MIT License.
    Full text available at: https://opensource.org/licenses/MIT
*/

import { parse } from "../kicad/parser";
import * as pcb_items from "../kicad/board";
import { WebGL2Renderer } from "../gfx/webgl/renderer";
import * as theme from "../kicad/theme";

import { Viewer } from "../framework/viewer";
import { Renderer } from "../gfx/renderer";
import { BoardPainter } from "./painter";
import { LayerName, LayerSet } from "./layers";

export class BoardViewer extends Viewer {
    board: pcb_items.KicadPCB;
    #painter: BoardPainter;

    constructor(canvas) {
        super(canvas);

        this.addEventListener("kicanvas:viewer:select", (e: Event) => {
            const { mouse: _, items } = (e as CustomEvent).detail;

            this.selected = null;

            for (const { layer: _, bbox } of items) {
                if (bbox.context instanceof pcb_items.Footprint) {
                    this.selected = bbox;
                    break;
                }
            }

            if (this.selected) {
                canvas.dispatchEvent(
                    new CustomEvent("kicad-board:item-selected", {
                        bubbles: true,
                        composed: true,
                        detail: this.selected.context,
                    }),
                );
            }
        });
    }

    override create_renderer(canvas: HTMLCanvasElement): Renderer {
        const renderer = new WebGL2Renderer(canvas);
        renderer.theme = theme.board;
        return renderer;
    }

    override async load(src: string | URL | File) {
        let pcb_text;
        if (src instanceof File) {
            pcb_text = await src.text();
        } else {
            pcb_text = await (await window.fetch(src)).text();
        }

        this.board = new pcb_items.KicadPCB(parse(pcb_text));

        this.layers = new LayerSet(this.board, this.renderer.theme);
        this.#painter = new BoardPainter(
            this.renderer,
            this.layers as LayerSet,
        );

        this.#painter.paint(this.board);

        this.#look_at_board();
        this.draw_soon();
    }

    #look_at_board() {
        const edge_cuts = this.layers.by_name(LayerName.edge_cuts);
        const board_bbox = edge_cuts.bbox;
        this.viewport.camera.bbox = board_bbox.grow(board_bbox.w * 0.1);
    }

    override get selection_color() {
        return theme.board.cursor;
    }
}
