import { BookOpenText } from "lucide-react";

export function Logo({
  size = "md",
  withText = true,
}: {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
}) {
  const box =
    size === "lg" ? "size-12" : size === "sm" ? "size-8" : "size-10";
  const icon = size === "lg" ? 26 : size === "sm" ? 18 : 22;
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-lg" : "text-xl";

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${box} grid place-items-center rounded-xl bg-primary text-white shadow-tosca-sm`}
      >
        <BookOpenText size={icon} />
      </div>
      {withText && (
        <div className="leading-tight">
          <span className={`${text} font-display font-bold text-primary-press`}>
            Dialektika
          </span>
        </div>
      )}
    </div>
  );
}
