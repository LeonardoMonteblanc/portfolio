// src/application/backup/ordem.ts
export interface DependenciaTabela {
  /** Tabela que possui a chave estrangeira. */
  tabela: string;
  /** Tabela referenciada (precisa existir antes). */
  referencia: string;
}

/**
 * Ordem de inserção respeitando chaves estrangeiras (Kahn).
 *
 * Não é o que garante a restauração — durante o processo as FKs são removidas e
 * recriadas (ver `restaurar.ts`) — mas deixa a falha no lugar certo quando algo
 * dá errado no meio, e evita depender de `session_replication_role`, que exige
 * superusuário e não existe em Postgres gerenciado.
 *
 * Auto-referência (ex.: `categoria.pai_id`) é ignorada: não há ordem possível
 * dentro da própria tabela, e é justamente por isso que as FKs são desligadas.
 */
export function ordenarPorDependencia(
  tabelas: string[],
  dependencias: DependenciaTabela[],
): string[] {
  const conjunto = new Set(tabelas);
  const dependentes = new Map<string, Set<string>>();
  const aguardando = new Map<string, number>();

  for (const tabela of tabelas) {
    dependentes.set(tabela, new Set());
    aguardando.set(tabela, 0);
  }

  for (const { tabela, referencia } of dependencias) {
    if (tabela === referencia) continue;
    if (!conjunto.has(tabela) || !conjunto.has(referencia)) continue;
    const filhos = dependentes.get(referencia);
    if (!filhos || filhos.has(tabela)) continue;
    filhos.add(tabela);
    aguardando.set(tabela, (aguardando.get(tabela) ?? 0) + 1);
  }

  const prontas = [...tabelas].filter((t) => aguardando.get(t) === 0).sort();
  const ordem: string[] = [];
  const vistas = new Set<string>();

  while (prontas.length > 0) {
    const atual = prontas.shift() as string;
    if (vistas.has(atual)) continue;
    vistas.add(atual);
    ordem.push(atual);

    for (const filha of dependentes.get(atual) ?? []) {
      const restante = (aguardando.get(filha) ?? 0) - 1;
      aguardando.set(filha, restante);
      if (restante === 0) {
        prontas.push(filha);
        prontas.sort();
      }
    }
  }

  // Ciclo: as FKs serão recriadas depois, então basta uma ordem determinística.
  const restantes = tabelas.filter((t) => !vistas.has(t)).sort();
  return [...ordem, ...restantes];
}
