import { useEffect, useState } from 'react';
import { api, definirAoPerderSessao, ErroApi, MENSAGEM_GENERICA, type Vendedor } from './api/cliente';
import { Carregando, FalhaAoCarregar } from './telas/Avisos';
import { Folha } from './telas/Folha';
import { Login } from './telas/Login/Login';
import { Pdv } from './telas/Pdv/Pdv';

// Máquina de estados da tela raiz: verificando a sessão, falha ao verificar, login ou PDV aberto.
// O vendedor da sessão continua guardado aqui, mas não é mais repassado ao <Pdv>: o topo do PDV
// mostra só a etapa da venda, e o nome do vendedor não aparece em nenhum lugar da tela de venda.
type Estado = { tela: 'verificando' } | { tela: 'falha'; mensagem: string } | { tela: 'login' } | { tela: 'pdv'; vendedor: Vendedor };

/**
 * Decide entre Login e PDV pela sessão (RF-F03, ADR-F01). Sessão válida ao abrir a página → PDV
 * direto; qualquer 401 de rota protegida (ex.: meia-noite) → volta ao login.
 */
export function App() {
  const [estado, setEstado] = useState<Estado>({ tela: 'verificando' });
  // Contador usado só para disparar de novo a verificação de sessão quando o vendedor toca "Tentar de novo".
  const [tentativa, setTentativa] = useState(0);

  // Registra uma única vez o aviso global de sessão perdida (401 em qualquer chamada) → volta ao login.
  useEffect(() => {
    definirAoPerderSessao(() => setEstado({ tela: 'login' }));
  }, []);

  useEffect(() => {
    // `ativo` evita atualizar o estado depois que o efeito foi descartado (nova tentativa ou desmontagem).
    let ativo = true;
    // `.catch` no fim (e não o 2º argumento do `.then`) pega também uma resposta 200 fora do
    // contrato (ex.: sem corpo), que quebra no `r.vendedor` — sem isso a página ficaria em "Carregando…".
    api
      .sessao()
      .then((r) => {
        if (ativo) setEstado({ tela: 'pdv', vendedor: r.vendedor });
      })
      .catch((e: unknown) => {
        if (!ativo) return;
        // 401 = sem sessão válida: caminho normal para o login. Qualquer outro erro mostra a tela de
        // falha; erros que não vêm da API (ex.: TypeError) viram a mensagem genérica, sem texto técnico.
        if (e instanceof ErroApi && e.status === 401) setEstado({ tela: 'login' });
        else setEstado({ tela: 'falha', mensagem: e instanceof ErroApi ? e.message : MENSAGEM_GENERICA });
      });
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  switch (estado.tela) {
    case 'login':
      return <Login aoEntrar={(vendedor) => setEstado({ tela: 'pdv', vendedor })} />;
    case 'pdv':
      return <Pdv />;
    // 'verificando' e 'falha' compartilham a mesma moldura: carregando ou aviso com "Tentar de novo".
    default:
      return (
        <Folha>
          <main style={{ padding: '28px 20px' }}>
            {estado.tela === 'verificando' ? (
              <Carregando />
            ) : (
              <FalhaAoCarregar
                mensagem={estado.mensagem}
                aoTentar={() => {
                  setEstado({ tela: 'verificando' });
                  setTentativa((n) => n + 1);
                }}
              />
            )}
          </main>
        </Folha>
      );
  }
}
