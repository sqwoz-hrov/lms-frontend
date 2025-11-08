// api/paymentsApi.ts — wrapper for creating payment forms
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

export type SubscriptionPaymentMethodResponseDto = {
	userId: string;
	paymentMethodId: string;
	type: YookassaPaymentMethodType;
	last4: Record<string, string | null> | string | null;
	createdAt: string;
	updatedAt: string;
};

export type CreatePaymentFormDto = {
	subscription_tier_id: string;
};

export type CreatePaymentFormResponseDto = {
	confirmation_url: string;
};

const PAYMENTS_FORMS = "/payments/forms";
const SUBSCRIPTION_PAYMENT_METHOD = "/subscriptions/payment-method";

export async function createPaymentForm(data: CreatePaymentFormDto): Promise<CreatePaymentFormResponseDto> {
	const res = await apiClient.post<CreatePaymentFormResponseDto>(PAYMENTS_FORMS, data);
	return res.data;
}

export async function getActiveSubscriptionPaymentMethod(): Promise<SubscriptionPaymentMethodResponseDto | null> {
	try {
		const res = await apiClient.get<SubscriptionPaymentMethodResponseDto>(SUBSCRIPTION_PAYMENT_METHOD);
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

export const PaymentsApi = {
	createForm: createPaymentForm,
	getActivePaymentMethod: getActiveSubscriptionPaymentMethod,
	deletePaymentMethod: deleteSubscriptionPaymentMethod,
};
