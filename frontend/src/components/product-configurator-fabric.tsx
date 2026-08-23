import React from 'react';
import ProductConfiguratorContainer from './product-configurator-container';

export function ProductConfigurator({ initialId, initialBlank, initialOpenUpload, product, productId, initialType, ...rest }: any) {
  // Map legacy prop names to the new container props
  const pid = initialId || productId || undefined;
  const initialProduct = product || (initialBlank ? null : undefined);
  return <ProductConfiguratorContainer product={initialProduct} productId={pid} initialType={initialType} {...rest} />;
}

export default ProductConfigurator;
