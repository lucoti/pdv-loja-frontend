import type { Aba } from './BarraInferior';
import s from './Pdv.module.css';

/** Nome da etapa mostrado no topo. A tela de cor/tamanho é a aba Produtos com um produto aberto. */
export function nomeEtapa(aba: Aba, naVariacao = false): string {
  if (naVariacao) return 'Cor e tamanho';
  return aba === 'produtos' ? 'Produtos' : aba === 'pedido' ? 'Pedido' : 'Dia';
}

/**
 * Cabeçalho fixo (RF-F04): mostra só a etapa em que o vendedor está — "Produtos", "Cor e tamanho",
 * "Pedido" ou "Dia" (decisão do Lucas, 2026-10-01; antes mostrava "BALCÃO", o vendedor e a data).
 * Ficar preso no alto ao rolar a tela vem do estilo `.cabecalho` (position: sticky), não daqui.
 *
 * ATENÇÃO: os testes de tela usam a etapa "Produtos" neste topo (papel `banner`) como sinal de que o
 * login deu certo (helper `esperarPdv` em tests/telas/ajuda.tsx). O texto não é um título (h1): cada
 * tela já tem o seu.
 *
 * ATENÇÃO (dependências dos testes, levantamento as-is de 2026-10-05): o helper `topoDoPdv` procura
 * um dos quatro nomes de etapa num `div` dentro de `header` (seletor 'header div'), e `esperarPdv` é
 * usado em praticamente todo teste de login e de PDV. Mudar a marcação (tag, estrutura) ou os nomes
 * quebra esse sinal. Além disso, `nomeEtapa` é importado direto por tests/telas/pdv.ajustes.test.tsx,
 * e os testes de PDV conferem o topo pelo papel `banner`. Remover ou renomear este componente exige o
 * inventário do AP-004.
 */
export function Cabecalho({ etapa }: { etapa: string }) {
  return (
    <header className={s.cabecalho}>
      <div className={s.etapa}>{etapa}</div>
    </header>
  );
}
