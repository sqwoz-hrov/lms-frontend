import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
// enter email => get code on tg
// enter tg

const OtpFormSchema = z.object({
  code: z
    .string()
    .regex(/^\d+$/, "Код должен состоять только из цифр")
    .length(6, "Код должен быть 6-символьным числом"),
});

export function OtpForm() {
  const form = useForm({
    resolver: zodResolver(OtpFormSchema),
    defaultValues: {
      code: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof OtpFormSchema>) => {
    alert(data.code);
    return Promise.resolve(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>OTP Код</FormLabel>
              <FormControl>
                <Input placeholder={"Введите код от бота"} {...field} />
              </FormControl>
              <FormDescription>
                Введите код, который вы получили в телеграме
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <p>{form.formState.errors.code?.message}</p>

        <Button type="submit">Отправить</Button>
      </form>
    </Form>
  );
}

const LoginFormSchema = z.object({
  email: z.string().email("Введите email"),
});

export function EmailForm() {
  const form = useForm({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof LoginFormSchema>) => {
    alert(data.email);
    return Promise.resolve(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Почта</FormLabel>
              <FormControl>
                <Input placeholder={"Введите почту"} {...field} />
              </FormControl>
              <FormDescription>
                Введите почту, на которую регистрировали аккаунт
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <p>{form.formState.errors.email?.message}</p>

        <Button type="submit">Отправить код в ТГ</Button>
      </form>
    </Form>
  );
}

// export function LoginForm() {
//   const [otp, setOtp] = useState(false);
//   const [email, setEmail] = useState("");

//   // when no otp is present, show email form
//   // when otp is present, show otp form
// }
