import { useCallback, useEffect, useRef, useState } from 'react';
import { ErroApi, MENSAGEM_GENERICA } from '../api/cliente';

export type Carga<T> =
  | { situacao: 'carregando' }
  | { situacao: 'ok'; dados: T }
  | { situacao: 'erro'; mensagem: string };

/**
 * Busca dados ao montar a tela, com "Tentar de novo" (RF-F10). Resposta que chega depois de a tela
 * sair (ou de uma busca mais nova) é descartada (AP-001).
 * O terceiro item, `atualizar`, busca de novo sem voltar para "carregando": a tela continua como está
 * e só troca os dados quando a resposta chega (ex.: catálogo depois de um 409 sem_estoque). Se falhar,
 * os dados atuais ficam.
 */
export function useCarregar<T>(buscar: () => Promise<T>): [Carga<T>, () => void, () => void] {
  const [carga, setCarga] = useState<Carga<T>>({ situacao: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  // Número da busca mais recente; só ela pode gravar o resultado.
  const ultima = useRef(0);

  useEffect(() => {
    const minha = ++ultima.current;
    setCarga({ situacao: 'carregando' });
    buscar().then(
      (dados) => minha === ultima.current && setCarga({ situacao: 'ok', dados }),
      (e: unknown) => minha === ultima.current && setCarga({ situacao: 'erro', mensagem: e instanceof ErroApi ? e.message : MENSAGEM_GENERICA }),
    );
    return () => {
      ultima.current++;
    };
    // `buscar` é recriada a cada render; a busca só se repete quando se pede outra tentativa.
  }, [tentativa]);

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), []);
  // Reusa o contador "ultima": a atualização silenciosa invalida qualquer busca anterior ainda pendente, e
  // a desmontagem da tela (cleanup do efeito) invalida a atualização.
  const atualizar = useCallback(() => {
    const minha = ++ultima.current;
    buscar().then(
      (dados) => minha === ultima.current && setCarga({ situacao: 'ok', dados }),
      () => undefined,
    );
    // Mesmo motivo do efeito acima: `buscar` é estável na prática (função do módulo api).
  }, []);
  return [carga, tentarDeNovo, atualizar];
}
