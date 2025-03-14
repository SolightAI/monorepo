from fastapi import HTTPException
from dto.schemas import ProductCreate as ProductCreateSchema
from dto.models import Product as ProductModel
from pydantic import UUID4
from typing import Optional, List
from urllib.parse import urlparse
from logging import getLogger
from uuid import UUID


logger = getLogger(__name__)


async def get_product(product_id: UUID4, organization_id: Optional[UUID] = None) -> ProductModel:
    """
    Get a product by ID, optionally filtering by organization.

    Args:
        product_id: The UUID of the product to retrieve
        organization_id: Optional organization ID to filter by

    Returns:
        The product if found

    Raises:
        HTTPException: If the product is not found or doesn't belong to the specified organization
    """
    query = ProductModel.filter(id=product_id)

    if organization_id:
        query = query.filter(organization_id=organization_id)

    product = await query.prefetch_related("epics").first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return product


async def get_product_by_url_path(url_path: str, organization_id: Optional[UUID] = None) -> Optional[ProductModel]:
    """
    Get product by matching a URL path segment against the product's URL.

    Args:
        url_path: The URL path segment to match (e.g., 'the-predictive-index')
        organization_id: Optional organization ID to filter by

    Returns:
        The matching product or None if no match is found
    """

    # Get the domain from the url_path
    cleaned_path = urlparse(url_path).netloc

    # Get products, filtered by organization if specified
    query = ProductModel.all()
    if organization_id:
        query = query.filter(organization_id=organization_id)

    products = await query

    for product in products:

        product_path = urlparse(product.url).netloc

        if len(product_path.split(".")) > 2:
            product_path = product_path.split(".")[-2]  # if it contains a ".com" (or other TLD)
        else:
            product_path = product_path.split(".")[-1]  # if it doesn't contain a ".com" (or other TLD) i.e "localhost:3000"

        if cleaned_path == product_path:
            return await ProductModel.get(id=product.id).prefetch_related("epics")

    return None


async def get_products_list(organization_id: Optional[UUID] = None) -> List[ProductModel]:
    """
    Get a list of all products, optionally filtered by organization.

    Args:
        organization_id: Optional organization ID to filter by

    Returns:
        List of products
    """
    query = ProductModel.all()

    if organization_id:
        query = query.filter(organization_id=organization_id)

    return await query.prefetch_related("epics")


async def create_product(product: ProductCreateSchema) -> ProductModel:
    """
    Create a new product.

    Args:
        product: The product data

    Returns:
        The created product with epics properly loaded
    """
    # Create the product
    created_product = await ProductModel.create(**product.model_dump())

    # Fetch the product with epics properly loaded
    return await get_product(created_product.id)


async def update_product(product_id: UUID4, product_data: dict) -> ProductModel:
    """
    Update a product by ID.

    Args:
        product_id: The UUID of the product to update
        product_data: Dictionary with fields to update

    Returns:
        The updated product

    Raises:
        HTTPException: If the product is not found
    """
    # Get the product
    product = await ProductModel.get_or_none(id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Update fields
    for key, value in product_data.items():
        setattr(product, key, value)

    # Save changes
    await product.save()

    # Return the updated product with epics
    return await get_product(product_id)


async def delete_product(product_id: UUID4, organization_id: Optional[UUID] = None) -> bool:
    """
    Delete a product by ID, optionally checking organization ownership.

    Args:
        product_id: The UUID of the product to delete
        organization_id: Optional organization ID to check ownership

    Returns:
        True if the product was deleted, False otherwise
    """
    query = ProductModel.filter(id=product_id)

    if organization_id:
        query = query.filter(organization_id=organization_id)

    product = await query.first()

    if not product:
        return False

    await product.delete()
    return True
