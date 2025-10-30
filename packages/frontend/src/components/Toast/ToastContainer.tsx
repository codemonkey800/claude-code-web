import { useAtom, useSetAtom } from 'jotai'

import { removeToastAtom, toastsAtom } from 'src/stores/toastStore'

import { Toast } from './Toast'

export function ToastContainer() {
  const [toasts] = useAtom(toastsAtom)
  const removeToast = useSetAtom(removeToastAtom)

  return (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          variant={toast.variant}
          title={toast.title}
          description={toast.description}
          duration={toast.duration}
          showCloseButton={toast.showCloseButton}
          icon={toast.icon}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  )
}
