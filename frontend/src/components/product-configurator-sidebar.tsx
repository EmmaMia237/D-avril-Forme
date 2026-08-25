import React, { useRef } from "react";
import { Button } from "@/components/ui/button";

export default function SidebarTabs({
  views,
  activeViewId,
  onSelectView,
  variants,
  selectedVariant,
  onSelectVariant,
  sizes,
  selectedSize,
  onSelectSize,
  onUploadImage,
  onAddText,
  onUndo,
  onRedo,
}: any) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="mb-2 text-sm font-semibold">Views</h4>
        <div className="flex gap-2 overflow-auto">
          {views.map((v: any) => (
            <button
              key={v.id}
              onClick={() => onSelectView(v.id)}
              className={`flex-shrink-0 rounded border px-3 py-1 text-sm ${v.id === activeViewId ? "bg-primary text-white" : "bg-gray-100"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="mb-2 text-sm font-semibold">Variants</h4>
        <div className="mb-2">
          <div className="flex gap-2">
            {variants?.map((v: any) => (
              <button
                key={v.name}
                onClick={() => onSelectVariant(v)}
                className={`px-3 py-1 rounded ${selectedVariant?.name === v.name ? "bg-primary text-white" : "bg-gray-100"}`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Size</label>
          <div className="flex gap-2">
            {sizes?.map((s: string) => (
              <button
                key={s}
                onClick={() => onSelectSize(s)}
                className={`px-3 py-1 rounded ${selectedSize === s ? "bg-primary text-white" : "bg-gray-100"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="mb-2 text-sm font-semibold">Design</h4>
        <div className="mb-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={(e) => onUploadImage(e.target.files)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fileRef.current?.click()} className="w-full">
            Upload Image
          </Button>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={onUndo} className="w-1/2">
            Undo
          </Button>
          <Button onClick={onRedo} className="w-1/2">
            Redo
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="mb-2 text-sm font-semibold">Text</h4>
        <TextTool onAddText={onAddText} />
      </div>
    </div>
  );
}

function TextTool({ onAddText }: any) {
  const ref = React.useRef<HTMLInputElement | null>(null);
  return (
    <div>
      <input
        ref={ref}
        type="text"
        placeholder="Type text and press Add"
        className="w-full rounded border border-border px-2 py-1 mb-2"
      />
      <div className="flex gap-2">
        <Button
          onClick={() => {
            if (ref.current?.value) {
              onAddText(ref.current.value);
              ref.current.value = "";
            }
          }}
          className="w-full"
        >
          Add Text
        </Button>
      </div>
    </div>
  );
}
