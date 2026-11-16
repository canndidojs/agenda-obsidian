# Anotaí

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

## Instalador

```
npm run dist
```

Gera `dist/Anotai-Setup-1.0.0.exe` (instalador para Windows, instala só para o usuário atual, sem precisar de administrador). O instalador não é assinado, então o Windows pode mostrar o aviso do SmartScreen ("Mais informações" > "Executar assim mesmo"). O app instalado começa com o Windows; dá para desligar no menu da bandeja.

## Onde ficam as anotações

O vault é descoberto sozinho a partir da configuração do Obsidian (o vault que estiver aberto). Para mudar, clique com o botão direito no ícone da bandeja > **Escolher pasta das anotações…** (o app reinicia e passa a usar a pasta escolhida) e, para desfazer, **Voltar para a pasta automática**. Também dá para definir a variável de ambiente `VAULT` com o caminho.

**Sem Obsidian?** Funciona igual: as anotações são arquivos Markdown comuns e ficam em `Documentos\Agenda Notas\Agenda`. O link "Abrir no Obsidian" só aparece quando a pasta é um vault do Obsidian. Se instalar o Obsidian depois, abra a pasta `Agenda Notas` como vault e tudo já estará lá (os links `[[ ]]` e os resumos da semana passam a funcionar).

## Uso

- Escreva e aperte Enter: a anotação entra com a hora.
- `#tags` no texto viram etiquetas coloridas (e o Obsidian as indexa). Ao digitar `#`, aparece uma lista de sugestões prontas (admin, dev, financeiro, reunião…) para escolher; a lista fica em `SUGESTOES`, no `index.html`. Clicar numa tag busca por ela.
- Passando o mouse numa anotação aparecem os botões de editar e apagar. Apagar mostra um aviso com "Desfazer".
- As notas da semana e do mês são geradas sozinhas: a semana junta os dias e as pendências abertas, o mês lista as semanas com contagens.
- `Ctrl+K` busca em todos os dias, sem diferenciar acentos nem maiúsculas.
- Marcar "Pendente" grava a anotação como `- [ ]`. Ela reaparece nos dias seguintes, em "Pendentes de dias anteriores", até ser concluída.
- `Ctrl+Alt+N` abre, de qualquer programa, uma janela mínima só com o campo de anotação (com sugestão de tags e `Alt+P` para marcar como pendente). `Enter` salva e a janela some; `Esc` ou clicar fora fecha sem salvar.
- `Ctrl+Alt+A` abre o Anotaí completo, com a lista do dia.
- Fechar a janela mantém o app na bandeja. Para encerrar, use "Sair" no ícone da bandeja.
- Rodando da pasta do projeto (sem instalar), para iniciar com o Windows coloque um atalho para `electron.exe "<pasta do app>" --hidden` em `shell:startup`.

O ícone é gerado por `tools/make-icon.ps1`.
