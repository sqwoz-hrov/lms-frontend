import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";

type FormValues = {

  peopleMode: "count" | "lazy";
  peopleCount?: number;

  interviewType: "screening" | "tech" | "system";
};

function ChalkRadio({
  name,
  value,
  label,
  register,
  checked,
  className,
  disabled,
}: {
  name: keyof FormValues;
  value: any;
  label: React.ReactNode;
  register: ReturnType<typeof useForm<FormValues>>["register"];
  checked?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={[
        "group relative flex gap-3 select-none",
        // ключевое: выравниваем по центру, а текст слегка опускаем
        "items-center",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className ?? "",
      ].join(" ")}
    >
      <input
        type="radio"
        value={value}
        disabled={disabled}
        className="sr-only"
        {...register(name as any)}
      />

      {/* кружок */}
      <span
        className={[
          "grid place-items-center size-6 rounded-full border-2 shrink-0",
          "border-black/70 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
        ].join(" ")}
        aria-hidden
      >
        <span
          className={[
            "size-2.5 rounded-full transition-opacity",
            checked ? "opacity-100 bg-black/90" : "opacity-0 bg-black/90",
          ].join(" ")}
        />
      </span>

      {/* текст/контент */}
      <span className="min-w-0 text-[18px] leading-snug text-black/90">
        {label}
      </span>
    </label>
  );
}

export function InterviewRecordingPropertyForm({
  onSuccess,
}: {
  onSuccess?: (email: string) => Promise<void>;
}) {

  const formDefalutValues = {
    peopleMode: "count",
    peopleCount: 2,
    interviewType: "tech",
  } satisfies FormValues;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    clearErrors,
  } = useForm<FormValues>({
    defaultValues: formDefalutValues,
  });

  const peopleMode = watch("peopleMode");
  const peopleCount = watch("peopleCount");
  const interviewType = watch("interviewType");

  React.useEffect(() => {
    if (peopleMode === "lazy") {
      // сбросить ошибку
      clearErrors("peopleCount");
    } else {
      // если вернулись обратно в "count" и поле пустое — можно поставить дефолт
      // (по желанию)
      if (!peopleCount) {
        setValue("peopleCount", formDefalutValues.peopleCount, { shouldDirty: true, shouldValidate: false });
      }
    }
  }, [peopleMode, clearErrors, setValue]);

  return (
    <form
      onSubmit={handleSubmit(async (d) => {
        // пример: тут можно собрать всё, что нужно бэкенду
        console.log("FORM DATA:", d);

        // твоя логика
        if (onSuccess) await onSuccess('pisyun');

        alert(
          "Здесь будет логика отправки данных на бэкенд, а пока просто вывод в консоль:\n" +
          JSON.stringify(d, null, 2)
        );
      })}
      className="w-full"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-center">

        <div className="flex-2 space-y-4">
          <div className="px-8 py-7">
            {/* ===== Число людей ===== */}
            <div className="space-y-4">
              <div className="text-[22px] font-medium tracking-wide ">
                Число людей на собесе{" "}
                <span className="">(это повышает точность)</span>
              </div>

              <div className="space-y-3">
                <ChalkRadio
                  name="peopleMode"
                  value="count"
                  register={register}
                  checked={peopleMode === "count"}
                  label={
                    <span className="flex items-center gap-3">
                      <span className="inline-block translate-y-[1px]"> </span>
                      <span
                        className={[
                          "inline-flex items-center justify-center",
                          "min-w-[54px] h-10 px-3",
                          "rounded-xl border-2 border-black/70",
                          "bg-white/0 ",
                        ].join(" ")}
                      >
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={20}
                          placeholder={formDefalutValues.peopleCount.toString()}
                          disabled={peopleMode !== "count"}
                          className={[
                            "w-[52px] bg-transparent text-center text-[18px] outline-none",
                            "placeholder:",
                            peopleMode !== "count" ? "cursor-not-allowed" : "",
                          ].join(" ")}
                          {...register("peopleCount", {
                            valueAsNumber: true,
                            validate: (v) => {
                              if (peopleMode !== "count") return true;
                              if (v == null || Number.isNaN(v)) return "Укажите число людей";
                              if (v < 1) return "Минимум 1";
                              if (v > 20) return "Слишком много (макс 20)";
                              return true;
                            },
                          })}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            // чтобы RHF корректно видел valueAsNumber даже при пустой строке
                            const val = e.target.value.trim();
                            setValue("peopleCount", val ? Number(val) : undefined, {
                              shouldValidate: true,
                            });
                          }}
                        />
                      </span>
                    </span>
                  }
                />

                <ChalkRadio
                  name="peopleMode"
                  value="lazy"
                  register={register}
                  checked={peopleMode === "lazy"}
                  label={<span>Мне лень :(</span>}
                />

                {errors.peopleCount ? (
                  <div className="pl-9 text-[14px] text-red-400">
                    {errors.peopleCount.message as string}
                  </div>
                ) : null}
              </div>
            </div>

            {/* ===== Тип собеседования ===== */}
            <div className="mt-10 space-y-4">
              <div className="text-[22px] font-medium tracking-wide ">
                Тип собеседования
              </div>

              <div className="space-y-3">
                <ChalkRadio
                  name="interviewType"
                  value="screening"
                  register={register}
                  checked={interviewType === "screening"}
                  label="Скрининг"
                />

                <ChalkRadio
                  name="interviewType"
                  value="tech"
                  register={register}
                  checked={interviewType === "tech"}
                  label="Техсобес"
                />

                <div className="relative">
                  <ChalkRadio
                    name="interviewType"
                    value="system"
                    register={register}
                    checked={interviewType === "system"}
                    label={
                      <span className={interviewType === "system" ? "text-red-400" : ""}>
                        Систем дизайн или лайвкод
                      </span>
                    }
                  />

                  {/* Тултип/плашка как на скрине — показываем только если выбран последний пункт */}
                  {interviewType === "system" ? (
                    <div
                      className={[
                        "pointer-events-none",
                        "absolute left-[340px] top-[-8px]",
                        "w-[420px]",
                        "rounded-3xl bg-white/85 px-6 py-5",
                        "shadow-[0_30px_80px_rgba(0,0,0,0.5)]",
                      ].join(" ")}
                    >
                      {/* маленький «хвостик» */}
                      <div
                        className={[
                          "absolute -left-6 top-8",
                          "h-10 w-10 rotate-45 rounded-[10px]",
                          "bg-white/85",
                        ].join(" ")}
                      />
                      <div className="text-[22px] leading-snug text-red-400">
                        Мы плохо обрабатываем такие записи)
                        <br />
                        Высока вероятность, что вы
                        <br />
                        зря сожжёте токены
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

        </div>
        <div className="md:w-[240px] flex-1">
          <Button className="w-full h-24" onClick={handleSubmit((val) => { console.log(val) })}><span className="text-[22px]">Анализировать</span></Button>
        </div>

      </div>
    </form>
  );
}

