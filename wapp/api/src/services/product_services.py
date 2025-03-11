from fastapi import HTTPException
from dto.schemas import ProductCreate as ProductCreateSchema
from dto.models import Product as ProductModel
from pydantic import UUID4
from typing import Optional, List


async def get_product(product_id: UUID4) -> ProductModel:

    product = await ProductModel.get_or_none(id=product_id).prefetch_related("epics")

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


async def get_product_by_url_path(url_path: str) -> Optional[ProductModel]:
    """
    Get product by matching a URL path segment against the product's URL.
    
    Args:
        url_path: The URL path segment to match (e.g., 'the-predictive-index')
        
    Returns:
        The matching product or None if no match is found
    """
    # Format the url_path to be compatible with the product URL
    # Remove any leading/trailing slashes
    cleaned_path = url_path.strip('/')
    
    # Get all products
    products = await ProductModel.all()
    
    # Find a product where url_path is part of the product URL
    for product in products:
        # Extract domain parts from the product URL
        product_domain = product.url.replace('http://', '').replace('https://', '').split('/')[0]
        
        # Check if the url_path is in the product domain
        if cleaned_path in product_domain:
            return await ProductModel.get(id=product.id).prefetch_related("epics")
            
    return None


async def get_products_list() -> List[ProductModel]:
    """
    Get a list of all products.
    
    Returns:
        List of all products
    """
    return await ProductModel.all()


async def create_product(product: ProductCreateSchema) -> ProductModel:
    product_model = await ProductModel.create(**product.model_dump())

    return await get_product(product_model.id)  # NOTE: a bit dirty, but it works (prevents issue with ManyToManyField)
