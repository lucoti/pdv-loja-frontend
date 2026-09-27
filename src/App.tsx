import { useEffect, useState } from 'react';
import { api, definirAoPerderSessao, ErroApi, type Vendedor } from './api/cliente';
import { Carregando, FalhaAoCarregar } from './telas/Avisos';
import { Folha } from './telas/Folha';
import { Login } from './telas/Login/Login';
import { Pdv } from './telas/Pdv/Pdv';

type Estado = { tela: 'verificando' } | { tela: 'falha'; mensagem: string } | { tela: 'login' } | { tela: 'pdv'; vendedor: Vendedor };

/**
 * Decide entre Login e PDV pela sessão (RF-F03, ADR-F01). Sessão válida ao abrir a página → PDV
 * direto; qualquer 401 de rota protegida (ex.: meia-noite) → volta ao login.
 */
export function App() {
  const [estado, setEstado] = useState<Estado>({ tela: 'verificando' });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    definirAoPerderSessao(() => setEstado({ tela: 'login' }));
  }, []);

  useEffect(() => {
    let ativo = true;
    api.sessao().then(
      (r) => ativo && setEstado({ tela: 'pdv', vendedor: r.vendedor }),
      (e: unknown) => {
        if (!ativo) return;
        if (e instanceof ErroApi && e.status === 401) setEstado({ tela: 'login' });
        else setEstado({ tela: 'falha', mensagem: e instanceof ErroApi ? e.message : String(e) });
      },
    );
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  switch (estado.tela) {
    case 'login':
      return <Login aoEntrar={(vendedor) => setEstado({ tela: 'pdv', vendedor })} />;
    case 'pdv':
      return <Pdv vendedor={estado.vendedor} />;
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
