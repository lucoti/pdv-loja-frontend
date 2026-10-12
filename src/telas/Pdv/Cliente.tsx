import { ArrowLeft } from '@phosphor-icons/react';
import { celularValido, mascararCelular } from '../../dominio/formatos';
import s from './Pdv.module.css';

/** Rascunho do formulário do cliente: o que o vendedor está digitando, antes de salvar. */
export interface RascunhoCliente {
  nome: string;
  /** Celular com a máscara, como aparece no campo. */
  celular: string;
}

/**
 * Formulário "Cliente do pedido" (MI-21), aberto pelo "Alterar" da aba Pedido. Nome e celular, os dois
 * opcionais; o celular, se preenchido, precisa de 11 dígitos (INV-030). O componente só desenha o topo
 * e os campos; "Salvar cliente" e "Venda sem cliente" ficam na barra de baixo (Pdv.tsx). O voltar e a
 * troca de aba descartam o que foi digitado.
 */
export function Cliente({ rascunho, aoMudar, aoVoltar }: { rascunho: RascunhoCliente; aoMudar: (r: RascunhoCliente) => void; aoVoltar: () => void }) {
  return (
    <>
      <div className={s.titulo}>
        <button type="button" className={s.voltar} onClick={aoVoltar} aria-label="Voltar para o pedido">
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className={`${s.tituloTexto} ${s.tituloPeca}`}>Cliente do pedido</h1>
      </div>
      {/* ATENÇÃO: o limite de 120 caracteres espelha o do back (`esquemas.ts`, nome do cliente aparado).
          Mudar só de um lado faz o back recusar o nome com 400 entrada_invalida. */}
      <label className={s.rotuloCampo}>
        <span>Nome</span>
        <input
          className={s.campo}
          value={rascunho.nome}
          onChange={(e) => aoMudar({ ...rascunho, nome: e.target.value })}
          placeholder="Nome do cliente"
          maxLength={120}
          autoComplete="off"
        />
      </label>
      <label className={s.rotuloCampo}>
        <span>Celular</span>
        {/* A máscara é refeita a cada tecla; o pedido guarda só os dígitos. */}
        <input
          className={s.campo}
          value={rascunho.celular}
          onChange={(e) => aoMudar({ ...rascunho, celular: mascararCelular(e.target.value) })}
          placeholder="(31) 99999-9999"
          inputMode="numeric"
          autoComplete="off"
        />
      </label>
      {!celularValido(rascunho.celular) && <div className={s.avisoCampo}>Complete o celular com DDD (11 números) ou deixe em branco.</div>}
    </>
  );
}
