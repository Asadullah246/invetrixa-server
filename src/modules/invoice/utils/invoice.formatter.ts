import { Prisma } from 'generated/prisma/client';
import {
  InvoiceResponseDto,
  InvoiceDetailResponseDto,
  InvoiceItemResponseDto,
  InvoicePaymentResponseDto,
} from '../dto';

// ==================== TYPE DEFINITIONS ====================

export type InvoiceWithIncludes = Prisma.InvoiceGetPayload<{
  include: {
    items: {
      include: {
        product: { select: { id: true; name: true; sku: true } };
      };
    };
    payments: true;
    customer: true;
    location: { select: { id: true; name: true } };
  };
}>;

export type InvoiceListItem = Prisma.InvoiceGetPayload<{
  include: {
    customer: {
      select: { firstName: true; lastName: true; companyName: true };
    };
    location: { select: { name: true } };
    _count: { select: { items: true } };
  };
}>;

export type InvoiceItemWithProduct = Prisma.InvoiceItemGetPayload<{
  include: {
    product: { select: { id: true; name: true; sku: true } };
  };
}>;

export type InvoicePayment = Prisma.InvoicePaymentGetPayload<object>;

// ==================== HELPER FUNCTIONS ====================

/**
 * Formats customer name from customer object
 */
export function formatCustomerName(customer: {
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  return (
    customer.companyName ||
    `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
  );
}

// ==================== FORMATTERS ====================

/**
 * Format invoice for list view (minimal data)
 */
export function formatListResponse(
  invoice: InvoiceListItem,
): InvoiceResponseDto {
  return {
    id: invoice.id,
    documentNumber: invoice.documentNumber,
    documentType: invoice.documentType,
    status: invoice.status,
    subject: invoice.subject,
    subtotal: invoice.subtotal.toString(),
    discountAmount: invoice.discountAmount.toString(),
    taxAmount: invoice.taxAmount.toString(),
    totalAmount: invoice.totalAmount.toString(),
    paidAmount: invoice.paidAmount.toString(),
    dueAmount: invoice.dueAmount.toString(),
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    customerName: formatCustomerName(invoice.customer),
    locationName: invoice.location.name,
    itemCount: invoice._count.items,
  };
}

/**
 * Format invoice for detail view (full data with relations)
 */
export function formatDetailResponse(
  invoice: InvoiceWithIncludes,
): InvoiceDetailResponseDto {
  const customerName = formatCustomerName(invoice.customer);

  return {
    id: invoice.id,
    documentNumber: invoice.documentNumber,
    documentType: invoice.documentType,
    status: invoice.status,
    subject: invoice.subject,
    subtotal: invoice.subtotal.toString(),
    discountAmount: invoice.discountAmount.toString(),
    taxAmount: invoice.taxAmount.toString(),
    totalAmount: invoice.totalAmount.toString(),
    paidAmount: invoice.paidAmount.toString(),
    dueAmount: invoice.dueAmount.toString(),
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    customerName,
    locationName: invoice.location.name,
    itemCount: invoice.items.length,
    paymentTerms: invoice.paymentTerms,
    validUntil: invoice.validUntil,
    notes: invoice.notes,
    customerNotes: invoice.customerNotes,
    termsConditions: invoice.termsConditions,
    sentAt: invoice.sentAt,
    acceptedAt: invoice.acceptedAt,
    paidAt: invoice.paidAt,
    customer: {
      id: invoice.customer.id,
      name: customerName,
      phone: invoice.customer.phone,
      email: invoice.customer.email,
    },
    location: {
      id: invoice.location.id,
      name: invoice.location.name,
    },
    items: invoice.items.map(formatItemResponse),
    payments: invoice.payments.map(formatPaymentResponse),
  };
}

/**
 * Format invoice item for response
 */
export function formatItemResponse(
  item: InvoiceItemWithProduct,
): InvoiceItemResponseDto {
  return {
    id: item.id,
    product: {
      id: item.product.id,
      name: item.product.name,
      sku: item.product.sku ?? '',
    },
    productName: item.productName,
    productSku: item.productSku,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toString(),
    discountAmount: item.discountAmount.toString(),
    taxAmount: item.taxAmount.toString(),
    lineTotal: item.lineTotal.toString(),
    notes: item.notes,
    sortOrder: item.sortOrder,
  };
}

/**
 * Format payment for response
 */
export function formatPaymentResponse(
  payment: InvoicePayment,
): InvoicePaymentResponseDto {
  return {
    id: payment.id,
    method: payment.paymentMethod,
    amount: payment.amount.toString(),
    transactionRef: payment.transactionRef,
    paymentDate: payment.paymentDate,
    notes: payment.notes,
  };
}
