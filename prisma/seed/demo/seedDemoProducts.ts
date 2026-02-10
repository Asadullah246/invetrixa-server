/**
 * Seed Demo Products
 *
 * Creates simple and variable products with variants.
 */

import {
  PrismaClient,
  ProductStatus,
  ProductType,
  MarkupType,
  Prisma,
} from 'generated/prisma/client';
import { faker } from '@faker-js/faker';
import { DEMO_TENANT_ID, DEMO_CATEGORY_IDS, DEMO_CONFIG } from './constants';

// Product templates by category
const PRODUCT_TEMPLATES = {
  electronics: [
    { name: 'Wireless Mouse', unit: 'PIECE' },
    { name: 'USB-C Hub', unit: 'PIECE' },
    { name: 'Bluetooth Speaker', unit: 'PIECE' },
    { name: 'Wireless Earbuds', unit: 'PIECE' },
    { name: 'Power Bank 10000mAh', unit: 'PIECE' },
    { name: 'Laptop Stand', unit: 'PIECE' },
  ],
  clothing: [
    { name: 'Classic T-Shirt', unit: 'PIECE', isVariable: true },
    { name: 'Denim Jeans', unit: 'PIECE', isVariable: true },
    { name: 'Cotton Polo', unit: 'PIECE', isVariable: true },
    { name: 'Hoodie', unit: 'PIECE', isVariable: true },
    { name: 'Formal Shirt', unit: 'PIECE', isVariable: true },
  ],
  home: [
    { name: 'Desk Lamp LED', unit: 'PIECE' },
    { name: 'Throw Pillow', unit: 'PIECE' },
    { name: 'Wall Clock', unit: 'PIECE' },
    { name: 'Photo Frame Set', unit: 'SET' },
    { name: 'Ceramic Vase', unit: 'PIECE' },
  ],
};

const SIZES = ['S', 'M', 'L', 'XL'];
const COLORS = ['Black', 'White', 'Navy', 'Red', 'Grey'];

function generateSku(prefix: string, index: number): string {
  return `DEMO-${prefix}-${String(index).padStart(3, '0')}`;
}

export async function seedDemoProducts(prisma: PrismaClient): Promise<void> {
  let productIndex = 1;
  let simpleCount = 0;
  let variableCount = 0;
  let variantCount = 0;

  await prisma.$transaction(async (tx) => {
    // =========================================================================
    // 1. Create Simple Electronics Products
    // =========================================================================
    for (const template of PRODUCT_TEMPLATES.electronics) {
      const sku = generateSku('ELC', productIndex++);
      // Generate random markup
      const markup = faker.number.int({
        min: DEMO_CONFIG.MARKUP_MIN,
        max: DEMO_CONFIG.MARKUP_MAX,
      });

      await tx.product.upsert({
        where: {
          id: `demo-product-${sku.toLowerCase()}`,
        },
        create: {
          id: `demo-product-${sku.toLowerCase()}`,
          name: template.name,
          slug: template.name.toLowerCase().replace(/\s+/g, '-'),
          sku,
          barcode: faker.string.numeric(13),
          shortDescription: faker.commerce.productDescription().slice(0, 200),
          description: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: faker.commerce.productDescription() },
                ],
              },
            ],
          },
          taxRate: 15,
          status: ProductStatus.ACTIVE,
          isFeatured: faker.datatype.boolean({ probability: 0.3 }),
          tags: ['electronics', 'demo'],
          reorderLevel: 10,
          unitType: template.unit,
          productType: ProductType.SIMPLE,
          markupType: MarkupType.PERCENT,
          markupValue: new Prisma.Decimal(markup),
          tenantId: DEMO_TENANT_ID,
        },
        update: {
          name: template.name,
          status: ProductStatus.ACTIVE,
        },
      });

      // Link to category
      await tx.productCategoryProduct.upsert({
        where: {
          productId_categoryId: {
            productId: `demo-product-${sku.toLowerCase()}`,
            categoryId: DEMO_CATEGORY_IDS.ACCESSORIES,
          },
        },
        create: {
          productId: `demo-product-${sku.toLowerCase()}`,
          categoryId: DEMO_CATEGORY_IDS.ACCESSORIES,
        },
        update: {},
      });

      simpleCount++;
    }

    // =========================================================================
    // 2. Create Simple Home Products
    // =========================================================================
    for (const template of PRODUCT_TEMPLATES.home) {
      const sku = generateSku('HOM', productIndex++);
      const markup = faker.number.int({
        min: DEMO_CONFIG.MARKUP_MIN,
        max: DEMO_CONFIG.MARKUP_MAX,
      });

      await tx.product.upsert({
        where: {
          id: `demo-product-${sku.toLowerCase()}`,
        },
        create: {
          id: `demo-product-${sku.toLowerCase()}`,
          name: template.name,
          slug: template.name.toLowerCase().replace(/\s+/g, '-'),
          sku,
          barcode: faker.string.numeric(13),
          shortDescription: faker.commerce.productDescription().slice(0, 200),
          taxRate: 15,
          status: ProductStatus.ACTIVE,
          tags: ['home', 'decor', 'demo'],
          reorderLevel: 5,
          unitType: template.unit,
          productType: ProductType.SIMPLE,
          markupType: MarkupType.PERCENT,
          markupValue: new Prisma.Decimal(markup),
          tenantId: DEMO_TENANT_ID,
        },
        update: {
          name: template.name,
          status: ProductStatus.ACTIVE,
        },
      });

      // Link to category
      await tx.productCategoryProduct.upsert({
        where: {
          productId_categoryId: {
            productId: `demo-product-${sku.toLowerCase()}`,
            categoryId: DEMO_CATEGORY_IDS.DECOR,
          },
        },
        create: {
          productId: `demo-product-${sku.toLowerCase()}`,
          categoryId: DEMO_CATEGORY_IDS.DECOR,
        },
        update: {},
      });

      simpleCount++;
    }

    // =========================================================================
    // 3. Create Variable Clothing Products with Variants
    // =========================================================================
    for (const template of PRODUCT_TEMPLATES.clothing.filter(
      (t) => t.isVariable,
    )) {
      const parentSku = generateSku('CLO', productIndex++);
      const parentId = `demo-product-${parentSku.toLowerCase()}`;
      const markup = faker.number.int({
        min: DEMO_CONFIG.MARKUP_MIN,
        max: DEMO_CONFIG.MARKUP_MAX,
      });

      // Create parent product
      await tx.product.upsert({
        where: { id: parentId },
        create: {
          id: parentId,
          name: template.name,
          slug: template.name.toLowerCase().replace(/\s+/g, '-'),
          sku: parentSku,
          shortDescription: `${template.name} - Available in multiple sizes and colors`,
          taxRate: 15,
          status: ProductStatus.ACTIVE,
          isFeatured: true,
          tags: ['clothing', 'fashion', 'demo'],
          reorderLevel: 20,
          unitType: 'PIECE',
          productType: ProductType.VARIABLE,
          markupType: MarkupType.PERCENT,
          markupValue: new Prisma.Decimal(markup),
          tenantId: DEMO_TENANT_ID,
        },
        update: {
          name: template.name,
          status: ProductStatus.ACTIVE,
        },
      });

      // Add attribute values to parent (all options)
      await tx.productAttributeValue.upsert({
        where: {
          productId_key: {
            productId: parentId,
            key: 'Size',
          },
        },
        create: {
          productId: parentId,
          key: 'Size',
          values: SIZES,
        },
        update: {
          values: SIZES,
        },
      });

      await tx.productAttributeValue.upsert({
        where: {
          productId_key: {
            productId: parentId,
            key: 'Color',
          },
        },
        create: {
          productId: parentId,
          key: 'Color',
          values: COLORS.slice(0, 3),
        },
        update: {
          values: COLORS.slice(0, 3),
        },
      });

      // Link to category
      await tx.productCategoryProduct.upsert({
        where: {
          productId_categoryId: {
            productId: parentId,
            categoryId: DEMO_CATEGORY_IDS.MENS_WEAR,
          },
        },
        create: {
          productId: parentId,
          categoryId: DEMO_CATEGORY_IDS.MENS_WEAR,
        },
        update: {},
      });

      variableCount++;

      // Create 2 variants per parent (Size + Color combinations)
      const variantCombos = [
        { size: 'M', color: 'Black' },
        { size: 'L', color: 'Navy' },
      ];

      for (const combo of variantCombos) {
        const variantSku = `${parentSku}-${combo.size}-${combo.color.toUpperCase().slice(0, 3)}`;
        const variantId = `demo-product-${variantSku.toLowerCase()}`;

        await tx.product.upsert({
          where: { id: variantId },
          create: {
            id: variantId,
            name: `${template.name} - ${combo.size}/${combo.color}`,
            slug: `${template.name.toLowerCase().replace(/\s+/g, '-')}-${combo.size.toLowerCase()}-${combo.color.toLowerCase()}`,
            sku: variantSku,
            barcode: faker.string.numeric(13),
            taxRate: 15,
            status: ProductStatus.ACTIVE,
            tags: ['clothing', 'variant', 'demo'],
            reorderLevel: 10,
            unitType: 'PIECE',
            productType: ProductType.VARIANT,
            parentId: parentId,
            markupType: MarkupType.PERCENT,
            markupValue: new Prisma.Decimal(markup),
            tenantId: DEMO_TENANT_ID,
          },
          update: {
            name: `${template.name} - ${combo.size}/${combo.color}`,
            status: ProductStatus.ACTIVE,
          },
        });

        // Add single attribute values to variant
        await tx.productAttributeValue.upsert({
          where: {
            productId_key: {
              productId: variantId,
              key: 'Size',
            },
          },
          create: {
            productId: variantId,
            key: 'Size',
            values: [combo.size],
          },
          update: {
            values: [combo.size],
          },
        });

        await tx.productAttributeValue.upsert({
          where: {
            productId_key: {
              productId: variantId,
              key: 'Color',
            },
          },
          create: {
            productId: variantId,
            key: 'Color',
            values: [combo.color],
          },
          update: {
            values: [combo.color],
          },
        });

        variantCount++;
      }
    }

    console.log(`   ✅ Products created:`);
    console.log(`      - ${simpleCount} simple products`);
    console.log(`      - ${variableCount} variable products`);
    console.log(`      - ${variantCount} variant products`);
    console.log(
      `      - Total: ${simpleCount + variableCount + variantCount} products`,
    );
  });
}
