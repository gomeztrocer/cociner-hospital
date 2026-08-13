import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportAppError } from '../../store/useErrorTraceStore'

interface AppErrorBoundaryProps { children: ReactNode }
interface AppErrorBoundaryState { crashed: boolean }

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { crashed: false }

  static getDerivedStateFromError(): AppErrorBoundaryState { return { crashed: true } }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportAppError({
      fase: 'Aplicación',
      accion: 'Mostrar la pantalla',
      error: new Error(`${error.message}\n${info.componentStack ?? ''}`),
      mensaje: 'La pantalla encontró un error inesperado.',
    })
  }

  render(): ReactNode {
    if (!this.state.crashed) return this.props.children
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-center">
        <div className="max-w-sm rounded-xl border border-red bg-surface p-5">
          <h1 className="text-base font-semibold text-text">No se pudo mostrar esta pantalla</h1>
          <p className="mt-2 text-xs text-text2">Copia la referencia del aviso y recarga la aplicación.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 min-h-11 w-full rounded-lg bg-accent text-sm font-semibold text-white">Recargar</button>
        </div>
      </main>
    )
  }
}
