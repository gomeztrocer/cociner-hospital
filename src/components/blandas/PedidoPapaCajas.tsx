import { calcularPedidoPapaPorCajas } from '../../data/blandas'

interface Props {
  bolsas: number
  className?: string
}

export default function PedidoPapaCajas({ bolsas, className = '' }: Props) {
  const pedido = calcularPedidoPapaPorCajas(bolsas)
  return (
    <div className={`text-[10px] ${className}`}>
      {pedido.bolsasNecesarias} bolsas necesarias · {pedido.cajasNecesarias} cajas ·{' '}
      {pedido.bolsasDisponibles} bolsas disponibles · sobran {pedido.bolsasSobrantes} bolsas
    </div>
  )
}
