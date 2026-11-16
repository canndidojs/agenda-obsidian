# Agenda Obsidian

Programa desktop (Electron) que mostra o dia atual e deixa anotar rápido. Tudo é gravado como Markdown dentro de um vault do Obsidian, organizado por ano, mês, semana e dia.

```
Agenda/
  2026/
    11 - Novembro/
      Novembro 2026.md      links das semanas
      Semana 47/
        Semana 47.md        links dos dias
        2026-11-16.md       anotações do dia
```

## Rodar

```
npm install
node node_modules/electron/install.js   # se o binário do Electron não baixar sozinho
npm start
```

O vault é descoberto sozinho a partir da configuração do Obsidian (o vault que estiver aberto). Para usar outro, defina a variável de ambiente `VAULT` com o caminho dele.

## Uso

- Escreva e aperte Enter: a anotação entra com a hora.
- `#tags` no texto viram etiquetas coloridas (e o Obsidian as indexa). Ao digitar `#`, aparecem as tags já usadas para escolher. Clicar numa tag busca por ela.
- Passando o mouse numa anotação aparecem os botões de editar e apagar. Apagar mostra um aviso com "Desfazer".
- As notas da semana e do mês são geradas sozinhas: a semana junta os dias e as pendências abertas, o mês lista as semanas com contagens.
- `Ctrl+K` busca em todos os dias, sem diferenciar acentos nem maiúsculas.
- Marcar "Pendente" grava a anotação como `- [ ]`. Ela reaparece nos dias seguintes, em "Pendentes de dias anteriores", até ser concluída.
- `Ctrl+Alt+N` abre a janela de qualquer lugar.
- Fechar a janela mantém o app na bandeja. Para encerrar, use "Sair" no ícone da bandeja.
- Para iniciar com o Windows, coloque um atalho para `electron.exe "<pasta do app>" --hidden` em `shell:startup`.

O ícone é gerado por `tools/make-icon.ps1`.
