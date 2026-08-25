import { useCallback, useMemo, useState } from "react";

export type PrintArea = { left: number; top: number; width: number; height: number };
export type ViewDef = {
  id: string;
  label: string;
  mockupUrlsByColor?: Record<string, string>;
  mockupUrl?: string;
  printArea?: Partial<PrintArea>;
};
export type Variant = { name: string; hex?: string; mockupKey?: string };

export function useConfiguratorState(initialProduct?: any) {
  const [product, setProduct] = useState<any | null>(initialProduct || null);
  const [activeViewId, setActiveViewId] = useState<string | null>(
    () => initialProduct?.views?.[0]?.id || initialProduct?.views?.[0]?.name || null,
  );
  const [viewStates, setViewStates] = useState<Record<string, string>>({}); // JSON per view (fabric JSON)
  const [undoStacks, setUndoStacks] = useState<Record<string, string[]>>({});
  const [redoStacks, setRedoStacks] = useState<Record<string, string[]>>({});

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    initialProduct?.variants?.[0] || null,
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(
    (initialProduct?.sizes && initialProduct.sizes[0]) || null,
  );
  const [quantity, setQuantity] = useState<number>(1);

  const views: ViewDef[] = useMemo(
    () =>
      (product?.views || []).map((v: any) => ({
        id: v.id || v._id || v.name,
        label: v.label || v.name || "View",
        mockupUrlsByColor: v.mockupUrlsByColor || v.mockupByColor || {},
        mockupUrl: v.mockupUrl || v.url || v.image,
        printArea: v.printArea,
      })),
    [product],
  );

  const basePrice = Number(product?.basePrice || product?.price || 0);
  const printSideFee = Number(product?.printSideFee || product?.printFee || 0);

  const setViewJSON = useCallback((viewId: string, json: string) => {
    setViewStates((s) => ({ ...s, [viewId]: json }));
  }, []);

  const pushUndo = useCallback((viewId: string, json: string) => {
    setUndoStacks((s) => ({ ...s, [viewId]: [...(s[viewId] || []), json].slice(-50) }));
    // clear redo
    setRedoStacks((s) => ({ ...s, [viewId]: [] }));
  }, []);

  const popUndo = useCallback(
    (viewId: string) => {
      const stack = undoStacks[viewId] || [];
      if (stack.length === 0) return null;
      const last = stack[stack.length - 1];
      setUndoStacks((s) => ({ ...s, [viewId]: stack.slice(0, -1) }));
      setRedoStacks((s) => ({ ...s, [viewId]: [...(s[viewId] || []), last].slice(-50) }));
      return last;
    },
    [undoStacks],
  );

  const popRedo = useCallback(
    (viewId: string) => {
      const stack = redoStacks[viewId] || [];
      if (stack.length === 0) return null;
      const last = stack[stack.length - 1];
      setRedoStacks((s) => ({ ...s, [viewId]: stack.slice(0, -1) }));
      setUndoStacks((s) => ({ ...s, [viewId]: [...(s[viewId] || []), last].slice(-50) }));
      return last;
    },
    [redoStacks],
  );

  const setProductSafe = useCallback(
    (p: any) => {
      setProduct(p);
      if (p?.views && p.views.length && !activeViewId)
        setActiveViewId(p.views[0].id || p.views[0].name || p.views[0]._id);
      setSelectedVariant(p?.variants?.[0] || null);
    },
    [activeViewId],
  );

  const viewsWithArtworkCount = useMemo(
    () => Object.keys(viewStates).filter((k) => !!viewStates[k]).length,
    [viewStates],
  );

  const totalPrice = useMemo(
    () => basePrice + viewsWithArtworkCount * printSideFee,
    [basePrice, viewsWithArtworkCount, printSideFee],
  );

  return {
    product,
    setProduct: setProductSafe,
    activeViewId,
    setActiveViewId,
    views,
    viewStates,
    setViewJSON,
    pushUndo,
    popUndo,
    popRedo,
    setSelectedVariant,
    selectedVariant,
    selectedSize,
    setSelectedSize,
    quantity,
    setQuantity,
    totalPrice,
    basePrice,
    printSideFee,
  };
}
