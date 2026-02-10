/**
 * Seed Demo Categories
 *
 * Creates hierarchical product categories.
 */

import { PrismaClient, ProductStatus } from 'generated/prisma/client';
import { DEMO_TENANT_ID, DEMO_CATEGORY_IDS } from './constants';

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
}

export async function seedDemoCategories(prisma: PrismaClient): Promise<void> {
  // Define category hierarchy
  const categories: CategoryData[] = [
    // Root categories
    {
      id: DEMO_CATEGORY_IDS.ELECTRONICS,
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and gadgets',
      parentId: null,
    },
    {
      id: DEMO_CATEGORY_IDS.CLOTHING,
      name: 'Clothing',
      slug: 'clothing',
      description: 'Apparel and fashion items',
      parentId: null,
    },
    {
      id: DEMO_CATEGORY_IDS.HOME_LIVING,
      name: 'Home & Living',
      slug: 'home-living',
      description: 'Home decor and furniture',
      parentId: null,
    },
    // Electronics children
    {
      id: DEMO_CATEGORY_IDS.SMARTPHONES,
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'Mobile phones and accessories',
      parentId: DEMO_CATEGORY_IDS.ELECTRONICS,
    },
    {
      id: DEMO_CATEGORY_IDS.LAPTOPS,
      name: 'Laptops',
      slug: 'laptops',
      description: 'Laptops and notebooks',
      parentId: DEMO_CATEGORY_IDS.ELECTRONICS,
    },
    {
      id: DEMO_CATEGORY_IDS.ACCESSORIES,
      name: 'Accessories',
      slug: 'accessories',
      description: 'Electronic accessories',
      parentId: DEMO_CATEGORY_IDS.ELECTRONICS,
    },
    // Clothing children
    {
      id: DEMO_CATEGORY_IDS.MENS_WEAR,
      name: "Men's Wear",
      slug: 'mens-wear',
      description: "Men's clothing and fashion",
      parentId: DEMO_CATEGORY_IDS.CLOTHING,
    },
    {
      id: DEMO_CATEGORY_IDS.WOMENS_WEAR,
      name: "Women's Wear",
      slug: 'womens-wear',
      description: "Women's clothing and fashion",
      parentId: DEMO_CATEGORY_IDS.CLOTHING,
    },
    {
      id: DEMO_CATEGORY_IDS.KIDS,
      name: 'Kids',
      slug: 'kids',
      description: "Children's clothing",
      parentId: DEMO_CATEGORY_IDS.CLOTHING,
    },
    // Home & Living children
    {
      id: DEMO_CATEGORY_IDS.FURNITURE,
      name: 'Furniture',
      slug: 'furniture',
      description: 'Home and office furniture',
      parentId: DEMO_CATEGORY_IDS.HOME_LIVING,
    },
    {
      id: DEMO_CATEGORY_IDS.DECOR,
      name: 'Decor',
      slug: 'decor',
      description: 'Home decoration items',
      parentId: DEMO_CATEGORY_IDS.HOME_LIVING,
    },
  ];

  await prisma.$transaction(async (tx) => {
    // First, create root categories (no parent)
    const rootCategories = categories.filter((c) => !c.parentId);
    for (const cat of rootCategories) {
      await tx.productCategory.upsert({
        where: { id: cat.id },
        create: {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          status: ProductStatus.ACTIVE,
          tenantId: DEMO_TENANT_ID,
          parentId: null,
        },
        update: {
          name: cat.name,
          slug: cat.slug,
          status: ProductStatus.ACTIVE,
        },
      });
    }

    // Then, create child categories
    const childCategories = categories.filter((c) => c.parentId);
    for (const cat of childCategories) {
      await tx.productCategory.upsert({
        where: { id: cat.id },
        create: {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          status: ProductStatus.ACTIVE,
          tenantId: DEMO_TENANT_ID,
          parentId: cat.parentId,
        },
        update: {
          name: cat.name,
          slug: cat.slug,
          status: ProductStatus.ACTIVE,
        },
      });
    }

    const rootCount = rootCategories.length;
    const childCount = childCategories.length;
    console.log(
      `   ✅ ${categories.length} categories created (${rootCount} root, ${childCount} children)`,
    );
  });
}
