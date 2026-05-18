type MotionTarget = HTMLElement;

const mobileGameEase = "cubic-bezier(0.16, 1, 0.3, 1)";
const buttonEase = "cubic-bezier(0.2, 0.9, 0.22, 1)";

export function shouldReduceDomMotion(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function playButtonPressMotion(element: MotionTarget, compact = false): void {
  if (shouldReduceDomMotion() || element.hasAttribute("disabled")) {
    return;
  }

  element.getAnimations().forEach((animation) => {
    if (animation instanceof Animation && animation.id === "aq-button-press") {
      animation.cancel();
    }
  });
  const depth = compact ? 0.97 : 0.94;
  const animation = element.animate(
    [
      { transform: "translateY(0) scale(1)", filter: "brightness(1)" },
      { transform: `translateY(2px) scale(${depth})`, filter: "brightness(1.16)" },
      { transform: "translateY(0) scale(1)", filter: "brightness(1)" }
    ],
    {
      duration: compact ? 130 : 170,
      easing: buttonEase
    }
  );
  animation.id = "aq-button-press";
}

export function installMobileGameTouchFeedback(element: MotionTarget, releaseOnLeave = false, compact = false): void {
  const press = (): void => {
    if (element.hasAttribute("disabled")) {
      return;
    }
    element.classList.add("is-touching");
    playButtonPressMotion(element, compact);
  };
  const release = (): void => element.classList.remove("is-touching");
  element.addEventListener("pointerdown", press);
  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", release);
  if (releaseOnLeave) {
    element.addEventListener("pointerleave", release);
  }
  element.addEventListener("blur", release);
}

export function playPageTransition(root: MotionTarget, reducedMotion = false): void {
  if (reducedMotion || shouldReduceDomMotion()) {
    return;
  }

  const page = root.firstElementChild;
  if (!(page instanceof HTMLElement)) {
    return;
  }
  page.animate(
    [
      { opacity: 0, transform: "translate3d(22px, 0, 0) scale(0.985)" },
      { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }
    ],
    {
      duration: 260,
      easing: mobileGameEase
    }
  );
}

export function playModalEnter(shell: MotionTarget, reducedMotion = false): void {
  if (reducedMotion || shouldReduceDomMotion()) {
    return;
  }

  requestAnimationFrame(() => {
    const panel = shell.querySelector(".aq-modal");
    shell.animate(
      [
        { opacity: 0 },
        { opacity: 1 }
      ],
      {
        duration: 150,
        easing: "linear"
      }
    );
    if (panel instanceof HTMLElement) {
      panel.animate(
        [
          { opacity: 0, transform: "translate3d(0, 18px, 0) scale(0.84)" },
          { opacity: 1, transform: "translate3d(0, -4px, 0) scale(1.035)", offset: 0.72 },
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" }
        ],
        {
          duration: 310,
          easing: mobileGameEase
        }
      );
    }
  });
}

export function removeWithModalExit(shell: MotionTarget, onDone?: () => void): void {
  if (shouldReduceDomMotion() || !shell.isConnected) {
    shell.remove();
    onDone?.();
    return;
  }

  shell.style.pointerEvents = "none";
  const panel = shell.querySelector(".aq-modal");
  const shellAnimation = shell.animate(
    [
      { opacity: 1 },
      { opacity: 0 }
    ],
    {
      duration: 130,
      easing: "linear",
      fill: "forwards"
    }
  );
  if (panel instanceof HTMLElement) {
    panel.animate(
      [
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        { opacity: 0, transform: "translate3d(0, 10px, 0) scale(0.92)" }
      ],
      {
        duration: 140,
        easing: "cubic-bezier(0.4, 0, 1, 1)",
        fill: "forwards"
      }
    );
  }
  shellAnimation.finished
    .catch(() => undefined)
    .then(() => {
      shell.remove();
      onDone?.();
    });
}
