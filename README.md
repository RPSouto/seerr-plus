<p align="center">
  <img src="./public/logo_full.svg" alt="Seerr Plus Edition" width="420">
</p>

<p align="center">
  <strong>PLUS EDITION</strong><br>
  Uma experiência colaborativa para pedidos e gestão de conteúdos Plex.
</p>

# Seerr Plus Edition

O **Seerr Plus Edition** é uma extensão do [Seerr](https://github.com/seerr-team/seerr) criada para transformar pedidos individuais numa experiência partilhada entre os membros de uma biblioteca Plex.

O projeto mantém o núcleo do Seerr tão próximo quanto possível da versão original e adiciona as novas funções numa camada interna própria. Assim, vários utilizadores podem demonstrar interesse no mesmo filme ou série sem criar pedidos duplicados no Radarr ou Sonarr.

## O que o Plus Edition acrescenta ao Seerr

- **Vários interessados num único pedido:** diferentes utilizadores associam-se ao mesmo conteúdo, mantendo apenas uma aquisição no Radarr ou Sonarr.
- **Identificação dos participantes:** mostra quem fez o pedido original e todos os utilizadores interessados, tanto nas páginas de conteúdo como na Administração.
- **Retirar interesse:** cada utilizador pode retirar o próprio interesse; quando já não existem interessados, o administrador recebe um aviso antes de remover o pedido.
- **Notificações de disponibilidade partilhadas:** quando o conteúdo fica disponível no Plex ou é marcado manualmente como disponível, o email pode ser enviado a todos os utilizadores interessados que tenham essa notificação ativa.
- **Reenvio de disponibilidade:** o administrador pode reenviar a notificação aos interessados a partir da interface.
- **Pedidos de remoção:** depois de ver um conteúdo, um utilizador interessado pode pedir a sua remoção e indicar um motivo, como “libertar espaço” ou “sem interesse”.
- **Gestão de remoções:** os administradores podem analisar, aprovar ou rejeitar pedidos de remoção e remover diretamente qualquer conteúdo.
- **Remoção no Radarr/Sonarr:** uma remoção aprovada pode apagar o título e os respetivos ficheiros através do serviço associado.
- **Permissões coerentes:** o botão e as notificações de remoção são apresentados ao administrador em todos os conteúdos e aos restantes utilizadores apenas nos conteúdos em que participam, respeitando as edições normal e 4K.
- **Scaffolding de coleções Plex:** inclui a base interna para futura sincronização de coleções, desativada até existir um adaptador configurado.
- **Interface traduzida e responsiva:** os novos controlos acompanham os idiomas do Seerr e estão preparados para desktop e dispositivos móveis.
- **Identidade própria:** tema preto e designação visível **Plus Edition**, permitindo distinguir imediatamente esta instalação do Seerr original.
- **Migração segura:** inclui migrações SQLite/PostgreSQL para preservar utilizadores, pedidos e configurações existentes.

## Filosofia do projeto

O Plus Edition não pretende substituir nem duplicar o funcionamento do Seerr. A sua função é acrescentar uma camada social e administrativa sobre o pedido original:

```text
1 conteúdo no Seerr
        ↓
1 pedido no Radarr/Sonarr
        ↓
vários utilizadores interessados
        ↓
notificações e decisões partilhadas
```

## Base e licença

Esta versão deriva do **Seerr v3.4.1** e mantém a licença do projeto original. O Seerr Plus Edition é um fork independente e não é um produto oficial da equipa Seerr.

- Projeto original: [seerr-team/seerr](https://github.com/seerr-team/seerr)
- Licença: [MIT](./LICENSE)
