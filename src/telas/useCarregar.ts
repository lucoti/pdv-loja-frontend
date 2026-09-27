import { useCallback, useEffect, useState } from 'react';
import { ErroApi, MENSAGEM_GENERICA } from '../api/cliente';

export type Carga<T> =
  | { situacao: 'carregando' }
  | { situacao: 'ok'; dados: T }
  | { situacao: 'erro'; mensagem: string };

/**
 * Busca dados ao montar a tela, com "Tentar de novo" (RF-F10). Resposta que chega depois de a tela
 * sair (ou de uma nova tentativa) é descartada.
 */
export function useCarregar<T>(buscar: () => Promise<T>): [Carga<T>, () => void] {
  const [carga, setCarga] = useState<Carga<T>>({ situacao: 'carregando' });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarga({ situacao: 'carregando' });
    buscar().then(
      (dados) => ativo && setCarga({ situacao: 'ok', dados }),
      (e: unknown) => ativo && setCarga({ situacao: 'erro', mensagem: e instanceof ErroApi ? e.message : MENSAGEM_GENERICA }),
    );
    return () => {
      ativo = false;
    };
    // `buscar` é recriada a cada render; a busca só se repete quando se pede outra tentativa.
  }, [tentativa]);

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), []);
  return [carga, tentarDeNovo];
}
