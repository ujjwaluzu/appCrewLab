type LoadingSpinnerProps = {
  label: string;
  inline?: boolean;
  small?: boolean;
};

export function LoadingSpinner({ label, inline = false, small = false }: LoadingSpinnerProps) {
  const Wrapper = inline ? "span" : "div";

  return (
    <Wrapper className={`crew-loading-spinner${inline ? " is-inline" : ""}`} role="status" aria-live="polite">
      <span className={`crew-spinner${small ? " is-small" : ""}`} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </Wrapper>
  );
}
