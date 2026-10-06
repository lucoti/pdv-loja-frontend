import { ArrowLeft } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import type { Aba } from './BarraInferior';
import s from './Pdv.module.css';

/** Nome da etapa em que o vendedor está. A tela de cor/tamanho é a aba Produtos com um produto aberto. */
export function nomeEtapa(aba: Aba, naVariacao = false): string {
  if (naVariacao) return 'Cor e tamanho';
  return aba === 'produtos' ? 'Produtos' : aba === 'pedido' ? 'Pedido' : 'Dia';
}

/**
 * Topo de cada tela do PDV, no formato do design "PDV Mobile Refatorado" (MI-09): título da tela, uma
 * linha de apoio opcional embaixo, botão de voltar opcional à esquerda e um complemento à direita
 * ("N modelos", "Cancelar pedido", a data). Fica preso no alto ao rolar pelo estilo `.topo` (sticky).
 *
 * O título visível segue o design ("Vendas de hoje" na aba Dia, o nome do produto em cor/tamanho), mas
 * o nome acessível do `<header>` é sempre o nome da etapa (`nomeEtapa`).
 *
 * ATENÇÃO: os testes usam esse nome acessível como sinal de que o PDV abriu e de em que etapa ele está
 * (helpers `topoDoPdv`/`esperarPdv` em tests/telas/ajuda.tsx, papel `banner` com nome). Trocar o
 * `aria-label` por outro texto quebra quase todos os testes de login e de PDV (AP-004).
 */
export function Cabecalho(props: {
  etapa: string;
  titulo?: string;
  apoio?: ReactNode;
  lateral?: ReactNode;
  /** Mostra o botão de voltar (tela de cor/tamanho) e diz o que ele faz. */
  aoVoltar?: () => void;
}) {
  return (
    <header className={s.topo} aria-label={props.etapa}>
      {props.aoVoltar && (
        <button type="button" className={s.voltar} onClick={props.aoVoltar} aria-label="Voltar para os produtos">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
      )}
      <div className={s.topoTexto}>
        <h1 className={s.topoTitulo}>{props.titulo ?? props.etapa}</h1>
        {props.apoio && <div className={s.topoApoio}>{props.apoio}</div>}
      </div>
      {props.lateral && <div className={s.topoLateral}>{props.lateral}</div>}
    </header>
  );
}
