import { useId, useMemo } from "react";
import type { UserRole } from "@/api/usersApi";
import { useUsersLoader } from "./UsersLoader";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL_VALUE = "__all__";

type UserSelectFilterProps = {
	label?: string;
	value?: string;
	onChange: (value?: string) => void;
	className?: string;
	placeholder?: string;
	allLabel?: string;
	allowedRoles?: UserRole[];
	disabled?: boolean;
	hideAllOption?: boolean;
};

export function UserSelectFilter({
	label,
	value,
	onChange,
	className,
	placeholder = "Выберите пользователя",
	allLabel = "Все пользователи",
	allowedRoles,
	disabled = false,
	hideAllOption = false,
}: UserSelectFilterProps) {
	const selectId = useId();
	const { users, isLoading, isError } = useUsersLoader();

	const filteredUsers = useMemo(() => {
		if (!allowedRoles?.length) return users;
		const roles = new Set<UserRole>(allowedRoles);
		return users.filter(user => roles.has(user.role));
	}, [users, allowedRoles]);

	const currentValue = value ?? (hideAllOption ? undefined : ALL_VALUE);
	const handleValueChange = (next: string) => {
		if (!hideAllOption && next === ALL_VALUE) {
			onChange(undefined);
			return;
		}
		onChange(next);
	};

	const missingValue =
		value && !filteredUsers.some(user => user.id === value) ? (
			<SelectItem value={value} disabled>
				Неизвестный пользователь
			</SelectItem>
		) : null;

	return (
		<div className={cn("grid gap-2", className)}>
			{label && <Label htmlFor={selectId}>{label}</Label>}
			<Select
				value={currentValue}
				onValueChange={handleValueChange}
				disabled={disabled || isLoading || (!filteredUsers.length && hideAllOption)}
			>
				<SelectTrigger id={selectId}>
					<SelectValue placeholder={isLoading ? "Загрузка..." : placeholder} />
				</SelectTrigger>
				<SelectContent>
					{!hideAllOption && <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>}
					{missingValue}
					{filteredUsers.map(user => (
						<SelectItem key={user.id} value={user.id}>
							{renderUserLabel(user.name, user.telegram_username)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{isError && <p className="text-sm text-destructive">Не удалось загрузить список пользователей</p>}
			{!isLoading && !filteredUsers.length && !isError && (
				<p className="text-xs text-muted-foreground">Нет доступных пользователей.</p>
			)}
		</div>
	);
}

function renderUserLabel(name?: string, telegramUsername?: string | null) {
	if (!name && !telegramUsername) return "Без имени";
	if (!telegramUsername) return name ?? "Без имени";
	return `${name ?? "Без имени"} (@${telegramUsername})`;
}
