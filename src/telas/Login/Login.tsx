import { useRef, useState } from 'react';
import { api, ErroApi, MENSAGEM_GENERICA, type Vendedor } from '../../api/cliente';
import { CaixaErro, Carregando, FalhaAoCarregar } from '../Avisos';
import c from '../comum.module.css';
import { Folha } from '../Folha';
import { useCarregar } from '../useCarregar';
import s from './Login.module.css';
import { TecladoPin } from './TecladoPin';

// Quantidade de números da senha: define os marcadores, o texto da instrução e quando o login dispara.
// ATENÇÃO: precisa ser igual à regra do back (TAMANHO_PIN em esquemas.ts, pattern do openapi.yaml) e
// do simulado; se divergir, o back recusa todo login com 400.
const TAMANHO_PIN = 8;

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
  // A senha digitada vive em "pinAtual" (lida na hora do toque) e é espelhada em "pin" para desenhar os
  // marcadores. Ler só o estado perderia números em toques mais rápidos que o redesenho da tela.
  const pinAtual = useRef('');
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const definirPin = (novo: string) => {
    pinAtual.current = novo;
    setPin(novo);
  };
  // "enviando" trava o teclado na tela; "travado" é a mesma trava lida na hora do toque, sem esperar a
  // tela ser redesenhada: é ela que garante um único pedido de login por tentativa.
  const [enviando, setEnviando] = useState(false);
  const travado = useRef(false);

  // Escolher ou trocar de vendedor (null = voltar à lista) recomeça do zero: o PIN e o erro eram do anterior.
  // O botão "Trocar vendedor" fica desabilitado enquanto a senha é validada: sem isso, o vendedor poderia
  // voltar à lista e, em seguida, o login em andamento abriria a venda de quem já não estava selecionado.
  const escolher = (v: Vendedor | null) => {
    setVendedor(v);
    definirPin('');
    setErro('');
  };

  // Valida a senha completa. Não há botão: quem chama é o último número digitado. No sucesso a trava
  // não é desligada, porque a tela de login é desmontada pelo aoEntrar. Durante a espera não há
  // indicador novo de "validando" (o design não prevê): os marcadores ficam cheios e o teclado, travado.
  const entrar = async (vendedorId: string, senha: string) => {
    travado.current = true;
    setEnviando(true);
    try {
      const resposta = await api.login(vendedorId, senha);
      aoEntrar(resposta.vendedor);
    } catch (e) {
      // Qualquer falha (senha errada, sem conexão, erro do servidor) apaga os números: sem botão para
      // repetir o envio, o vendedor digita a senha de novo.
      definirPin('');
      setErro(e instanceof ErroApi ? e.message : MENSAGEM_GENERICA);
      travado.current = false;
      setEnviando(false);
    }
  };

  // Digitar ou apagar some com a mensagem de erro, porque ela se refere à tentativa anterior. O último
  // número dispara a validação; enquanto ela não volta, o teclado não responde.
  const digitar = (d: string) => {
    if (!vendedor || travado.current) return;
    const senha = pinAtual.current + d;
    definirPin(senha);
    setErro('');
    if (senha.length === TAMANHO_PIN) void entrar(vendedor.id, senha);
  };

  const apagar = () => {
    if (travado.current) return;
    definirPin(pinAtual.current.slice(0, -1));
    setErro('');
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

  return (
    <div className={s.senha}>
      <div className={s.quem}>
        {varios && (
          <button type="button" className={c.voltar} disabled={enviando} onClick={() => escolher(null)} aria-label="Trocar vendedor">
            ←
          </button>
        )}
        <div className={s.quemTexto}>
          <div className={s.nomeAtual}>{vendedor.nome}</div>
          <div className={s.instrucao}>Digite sua senha de {TAMANHO_PIN} números</div>
        </div>
      </div>

      <div className={s.marcadores} role="img" aria-label={`${pin.length} de ${TAMANHO_PIN} números digitados`}>
        {Array.from({ length: TAMANHO_PIN }, (_, i) => (
          <span key={i} className={`${s.marcador} ${i < pin.length ? s.preenchido : ''}`} />
        ))}
      </div>

      {erro && <CaixaErro mensagem={erro} />}

      <TecladoPin aoDigitar={digitar} aoApagar={apagar} desabilitado={enviando} />
    </div>
  );
}
