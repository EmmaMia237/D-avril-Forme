import React, { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { Canvas, Image as FabricImage, IText, loadSVGFromString, util as fabricUtil } from "fabric";

type PrintArea = { left: number; top: number; width: number; height: number };

export type CanvasStageHandle = {
  loadViewJson: (json: string | null) => void;
  getViewJson: () => string | null;
  exportDesignPNG: (multiplier?: number) => Promise<string>;
  addImageFromDataUrl: (dataUrl: string) => Promise<void>;
  addText: (text: string, opts?: any) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
};

const CanvasStage = forwardRef(function CanvasStage(
  { mockupUrl, printArea }: { mockupUrl?: string; printArea?: Partial<PrintArea> },
  ref: React.Ref<CanvasStageHandle>,
) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<any | null>(null);
  const baseImgRef = useRef<HTMLImageElement | null>(null);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const lastSavedJsonRef = useRef<string | null>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const el = document.createElement("canvas");
    const width = printArea && printArea.width ? printArea.width : 600;
    const height = printArea && printArea.height ? printArea.height : 600;
    el.width = width;
    el.height = height;
    el.style.position = "absolute";
    el.style.left = `${(printArea && printArea.left) || 0}px`;
    el.style.top = `${(printArea && printArea.top) || 0}px`;
    el.style.zIndex = "20";
    wrapperRef.current.appendChild(el);

    const c = new Canvas(el, { backgroundColor: "transparent", preserveObjectStacking: true });

    function keepInside(obj: any) {
      if (!obj) return;
      obj.setCoords();
      const bound = obj.getBoundingRect(true, true);
      const w = c.getWidth();
      const h = c.getHeight();
      if (bound.left < 0) obj.left = Math.max(0, obj.left - bound.left);
      if (bound.top < 0) obj.top = Math.max(0, obj.top - bound.top);
      if (bound.left + bound.width > w)
        obj.left = Math.min(w - bound.width, obj.left - (bound.left + bound.width - w));
      if (bound.top + bound.height > h)
        obj.top = Math.min(h - bound.height, obj.top - (bound.top + bound.height - h));
    }

    c.on("object:moving", (e: any) => keepInside(e.target));
    c.on("object:scaling", (e: any) => keepInside(e.target));
    c.on("object:rotating", (e: any) => keepInside(e.target));

    // push state on modifications
    const pushState = () => {
      try {
        const json = JSON.stringify(c.toJSON());
        if (lastSavedJsonRef.current !== json) {
          undoStackRef.current.push(json);
          lastSavedJsonRef.current = json;
          // limit
          if (undoStackRef.current.length > 50) undoStackRef.current.shift();
          redoStackRef.current = [];
        }
      } catch (e) {}
    };

    c.on("object:added", pushState);
    c.on("object:modified", pushState);
    c.on("object:removed", pushState);

    canvasRef.current = c;

    return () => {
      try {
        c.dispose();
      } catch (e) {}
      if (el.parentNode) el.parentNode.removeChild(el);
      canvasRef.current = null;
    };
  }, []); // only on mount

  useEffect(() => {
    if (baseImgRef.current && mockupUrl) baseImgRef.current.src = mockupUrl;
  }, [mockupUrl]);

  useImperativeHandle(
    ref,
    () => ({
      loadViewJson: (json) => {
        const c = canvasRef.current;
        if (!c) return;
        try {
          c.clear();
          if (json)
            c.loadFromJSON(json, () => {
              c.renderAll();
              lastSavedJsonRef.current = JSON.stringify(c.toJSON());
            });
          else {
            c.renderAll();
            lastSavedJsonRef.current = null;
          }
          // reset undo/redo stacks
          undoStackRef.current = [];
          redoStackRef.current = [];
        } catch (e) {
          console.warn(e);
        }
      },
      getViewJson: () => {
        if (!canvasRef.current) return null;
        try {
          return JSON.stringify(canvasRef.current.toJSON());
        } catch (e) {
          return null;
        }
      },
      exportDesignPNG: async (multiplier = 3) => {
        if (!canvasRef.current) return "";
        try {
          return canvasRef.current.toDataURL({ format: "png", multiplier });
        } catch (e) {
          return "";
        }
      },
      addImageFromDataUrl: async (dataUrl) => {
        if (!canvasRef.current) return;
        const c = canvasRef.current;
        if (dataUrl.trim().startsWith("<svg")) {
          try {
            loadSVGFromString(dataUrl, (objects: any, options: any) => {
              const obj = fabricUtil.groupSVGElements(objects, options);
              obj.scaleToWidth(c.getWidth() * 0.6);
              obj.set({
                left: c.getWidth() / 2,
                top: c.getHeight() / 2,
                originX: "center",
                originY: "center",
              });
              c.add(obj).setActiveObject(obj);
              c.requestRenderAll();
            });
          } catch (e) {
            console.warn(e);
          }
        } else {
          return new Promise<void>((res) => {
            FabricImage.fromURL(
              dataUrl,
              (img: any) => {
                const maxW = c.getWidth() * 0.7;
                if (img.width) img.scaleToWidth(Math.min(maxW, img.width));
                img.set({
                  left: c.getWidth() / 2,
                  top: c.getHeight() / 2,
                  originX: "center",
                  originY: "center",
                });
                c.add(img).setActiveObject(img);
                c.requestRenderAll();
                res();
              },
              { crossOrigin: "Anonymous" },
            );
          });
        }
      },
      addText: (text, opts = {}) => {
        if (!canvasRef.current) return;
        const c = canvasRef.current;
        const it = new IText(text || "Text", {
          left: c.getWidth() / 2,
          top: c.getHeight() / 2,
          originX: "center",
          originY: "center",
          fontSize: 36,
          fill: "#000",
          ...opts,
        });
        c.add(it).setActiveObject(it);
        c.requestRenderAll();
      },
      undo: () => {
        const c = canvasRef.current;
        if (!c) return;
        if (undoStackRef.current.length <= 1) return;
        const last = undoStackRef.current.pop();
        if (!last) return;
        redoStackRef.current.push(last);
        const prev = undoStackRef.current[undoStackRef.current.length - 1];
        if (prev) {
          c.clear();
          try {
            c.loadFromJSON(prev, () => c.renderAll());
          } catch (e) {
            console.warn(e);
          }
        }
      },
      redo: () => {
        const c = canvasRef.current;
        if (!c) return;
        const next = redoStackRef.current.pop();
        if (!next) return;
        undoStackRef.current.push(next);
        c.clear();
        try {
          c.loadFromJSON(next, () => c.renderAll());
        } catch (e) {
          console.warn(e);
        }
      },
      reset: () => {
        const c = canvasRef.current;
        if (!c) return;
        c.clear();
        c.renderAll();
        undoStackRef.current = [];
        redoStackRef.current = [];
        lastSavedJsonRef.current = null;
      },
    }),
    [],
  );

  // visual layout: wrapper with base image and dashed print area
  return (
    <div className="relative w-full h-full bg-gray-50 overflow-hidden" style={{ minHeight: 420 }}>
      <div ref={wrapperRef} style={{ position: "relative", width: "100%", height: "100%" }}>
        <img
          ref={baseImgRef}
          src={mockupUrl || "/placeholder-product.png"}
          alt="mockup"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            zIndex: 10,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: (printArea && printArea.left) || 0,
            top: (printArea && printArea.top) || 0,
            width: (printArea && printArea.width) || 600,
            height: (printArea && printArea.height) || 600,
            border: "2px dashed rgba(0,0,0,0.12)",
            zIndex: 15,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
});

export default CanvasStage;
