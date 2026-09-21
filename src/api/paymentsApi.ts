// api/paymentsApi.ts — wrappers for payments- and payment-method-related endpoints
import { isAxiosError } from "axios";

import apiClient from "./client";

export type YookassaPaymentMethodType =
	| "bank_card"
	| "yoo_money"
	| "electronic_certificate"
	| "sberbank"
	| "tinkoff_bank"
	| "sbp"
	| "sber_loan"
	| "sber_bnpl"
	| "b2b_sberbank"
	| "mobile_balance"
	| "cash";

export type PaymentMethodResponseDto = {
	userId: string;
	id?: string;
	paymentMethodId?: string;
	type: YookassaPaymentMethodType;
	last4: Record<string, string | null> | string | null;
	createdAt: string;
	updatedAt: string;
	nextBillingAt?: string | null;
	problemsWithPaymentMethod?: boolean;
};

export type PaymentMethodConfirmationResponseDto = {
	confirmation_url: string;
};

export type ChargeSubscriptionDto = {
	current_tier_id: string;
};

export type ChargeSubscriptionResponseDto = {
	paymentId: string;
	status: string;
	paid: boolean;
	amountRubles: number;
	createdAt: string;
	confirmationUrl?: string;
};

export type PaymentHistoryItemDto = {
	paymentMethodName: string;
	amount: number;
	currency: "RUB";
	date: string;
};

export type PaymentHistoryPaginationDto = {
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
};

export type PaymentHistoryResponseDto = {
	items: PaymentHistoryItemDto[];
	pagination: PaymentHistoryPaginationDto;
};

export type ListPaymentHistoryParams = {
	page?: number;
	pageSize?: number;
};

const PAYMENTS_CHARGE = "/payments/charge";
const PAYMENTS_HISTORY = "/payments/history";
const SUBSCRIPTION_PAYMENT_METHOD = "/payments/payment-method";

export async function addSubscriptionPaymentMethod(): Promise<PaymentMethodConfirmationResponseDto> {
	const res = await apiClient.post<PaymentMethodConfirmationResponseDto>(SUBSCRIPTION_PAYMENT_METHOD);
	return res.data;
}

export async function getActiveSubscriptionPaymentMethod(): Promise<PaymentMethodResponseDto | null> {
	try {
		const res = await apiClient.get<PaymentMethodResponseDto>(SUBSCRIPTION_PAYMENT_METHOD);
		return res.data;
	} catch (error) {
		if (isAxiosError(error) && error.response?.status === 404) {
			return null;
		}
		throw error;
	}
}

export async function deleteSubscriptionPaymentMethod(): Promise<void> {
	await apiClient.delete(SUBSCRIPTION_PAYMENT_METHOD);
}

export async function chargeSubscription(data: ChargeSubscriptionDto): Promise<ChargeSubscriptionResponseDto> {
	const res = await apiClient.post<ChargeSubscriptionResponseDto>(PAYMENTS_CHARGE, data);
	return res.data;
}

export async function listPaymentHistory(params: ListPaymentHistoryParams = {}): Promise<PaymentHistoryResponseDto> {
	const res = await apiClient.get<PaymentHistoryResponseDto>(PAYMENTS_HISTORY, {
		params,
	});
	return res.data;
}

export const PaymentsApi = {
	addPaymentMethod: addSubscriptionPaymentMethod,
	getActivePaymentMethod: getActiveSubscriptionPaymentMethod,
	deletePaymentMethod: deleteSubscriptionPaymentMethod,
	chargeSubscription,
	listHistory: listPaymentHistory,
};
