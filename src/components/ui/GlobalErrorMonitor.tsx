import { useEffect } from 'react'
import { reportAppError } from '../../store/useErrorTraceStore'

export default function GlobalErrorMonitor() {
  useEffect(() => {
    const onError = (event: ErrorEvent): void => {
      reportAppError({
        fase: 'Aplicación', accion: 'Ejecutar la pantalla', error: event.error ?? event.message,
        mensaje: 'Se produjo un error inesperado en la aplicación.',
      })
    }
    const onRejection = (event: PromiseRejectionEvent): void => {
      reportAppError({
        fase: 'Aplicación', accion: 'Completar una operación', error: event.reason,
        mensaje: 'Una operación terminó de forma inesperada.',
      })
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
