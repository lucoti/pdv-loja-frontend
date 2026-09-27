import { useState } from 'react';
import { api, ErroApi, MENSAGEM_GENERICA, type Vendedor } from '../../api/cliente';
import { CaixaErro, Carregando, FalhaAoCarregar } from '../Avisos';
import c from '../comum.module.css';
import { Folha } from '../Folha';
import { useCarregar } from '../useCarregar';
import s from './Login.module.css';
import { TecladoPin } from './TecladoPin';

const TAMANHO_PIN = 4;

/** Tela de login (handoff §1; RF-F01, RF-F02). */
export function Login({ aoEntrar }: { aoEntrar: (vendedor: Vendedor) => void }) {
  const [carga, tentarDeNovo] = useCarregar(async () => {
    const [config, lista] = await Promise.all([api.config(), api.vendedores()]);
    return { unidade: config.loja.unidade, vendedores: lista.vendedores };
  });

  return (
    <Folha>
      <header className={s.cabecalho}>
        <div className={s.marca}>BALCÃO</div>
        <div className={s.loja}>Ponto de venda{carga.situacao === 'ok' ? ` · ${carga.dados.unidade}` : ''}</div>
      </header>

      <main className={s.conteudo}>
        {carga.situacao === 'carregando' && <Carregando />}
        {carga.situacao === 'erro' && <FalhaAoCarregar mensagem={carga.mensagem} aoTentar={tentarDeNovo} />}
        {carga.situacao === 'ok' && <Etapas vendedores={carga.dados.vendedores} aoEntrar={aoEntrar} />}
      </main>

      {/* A linha "Senha de teste" do protótipo foi removida, como pede o handoff. */}
      <footer className={s.rodape}>Esqueceu a senha? Peça ao gerente.</footer>
    </Folha>
  );
}

/** Etapas do login: escolha do vendedor (se houver mais de um) e digitação do PIN. */
function Etapas({ vendedores, aoEntrar }: { vendedores: Vendedor[]; aoEntrar: (vendedor: Vendedor) => void }) {
  const varios = vendedores.length > 1;
  // Com um único vendedor a etapa "Quem está vendendo?" é omitida (regra 9 do handoff).
  const [vendedor, setVendedor] = useState<Vendedor | null>(varios ? null : (vendedores[0] ?? null));
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const escolher = (v: Vendedor | null) => {
    setVendedor(v);
    setPin('');
    setErro('');
  };

  const digitar = (d: string) => {
    setPin((atual) => (atual.length >= TAMANHO_PIN ? atual : atual + d));
    setErro('');
  };

  const apagar = () => {
    setPin((atual) => atual.slice(0, -1));
    setErro('');
  };

  const entrar = async () => {
    if (!vendedor || pin.length < TAMANHO_PIN || enviando) return;
    setEnviando(true);
    try {
      const resposta = await api.login(vendedor.id, pin);
      aoEntrar(resposta.vendedor);
    } catch (e) {
      // PIN errado limpa o PIN; falha de rede mantém o PIN para tentar de novo.
      if (e instanceof ErroApi && e.status === 401) setPin('');
      setErro(e instanceof ErroApi ? e.message : MENSAGEM_GENERICA);
      setEnviando(false);
    }
  };

  if (!vendedor) {
    return (
      <div className={s.selecao}>
        <h1 className={s.titulo}>Quem está vendendo?</h1>
        <div className={s.lista}>
          {vendedores.map((v) => (
            <button key={v.id} type="button" className={s.vendedor} onClick={() => escolher(v)}>
              <span className={s.inicial} aria-hidden="true">
                {v.nome.charAt(0)}
              </span>
              <span className={s.dados}>
                <span className={s.nome}>{v.nome}</span>
                <span className={s.cargo}>{v.cargo}</span>
              </span>
              <span className={s.seta} aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const completo = pin.length === TAMANHO_PIN;
  return (
    <div className={s.senha}>
      <div className={s.quem}>
        {varios && (
          <button type="button" className={c.voltar} onClick={() => escolher(null)} aria-label="Trocar vendedor">
            ←
          </button>
        )}
        <div className={s.quemTexto}>
          <div className={s.nomeAtual}>{vendedor.nome}</div>
          <div className={s.instrucao}>Digite sua senha de 4 números</div>
        </div>
      </div>

      <div className={s.marcadores} role="img" aria-label={`${pin.length} de ${TAMANHO_PIN} números digitados`}>
        {Array.from({ length: TAMANHO_PIN }, (_, i) => (
          <span key={i} className={`${s.marcador} ${i < pin.length ? s.preenchido : ''}`} />
        ))}
      </div>

      {erro && <CaixaErro mensagem={erro} />}

      <TecladoPin aoDigitar={digitar} aoApagar={apagar} />

      <button type="button" className={`${c.cta} ${s.entrar}`} disabled={!completo || enviando} onClick={entrar}>
        Entrar no PDV
      </button>
    </div>
  );
}
