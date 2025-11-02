// api/paymentsApi.ts — wrapper for creating payment forms
import apiClient from "./client";

export type CreatePaymentFormDto = {
	subscription_tier_id: string;
};

export type CreatePaymentFormResponseDto = {
	confirmation_url: string;
};

const PAYMENTS_FORMS = "/payments/forms";

export async function createPaymentForm(
	data: CreatePaymentFormDto,
): Promise<CreatePaymentFormResponseDto> {
	const res = await apiClient.post<CreatePaymentFormResponseDto>(PAYMENTS_FORMS, data);
	return res.data;
}

export const PaymentsApi = {
	createForm: createPaymentForm,
};
