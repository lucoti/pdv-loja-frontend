import c from './comum.module.css';

/** "Carregando…" em texto simples (RF-F10). */
export function Carregando() {
  return (
    <div className={c.carregando} role="status">
      Carregando…
    </div>
  );
}

/** Caixa de erro no estilo do login. */
export function CaixaErro({ mensagem }: { mensagem: string }) {
  return (
    <div className={c.erro} role="alert">
      {mensagem}
    </div>
  );
}

/** Erro ao carregar dados, com "Tentar de novo" (RF-F10). */
export function FalhaAoCarregar({ mensagem, aoTentar }: { mensagem: string; aoTentar: () => void }) {
  return (
    <div className={c.aviso}>
      <CaixaErro mensagem={mensagem} />
      <button type="button" className={c.tentarDeNovo} onClick={aoTentar}>
        Tentar de novo
      </button>
    </div>
  );
}
