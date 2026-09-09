@echo off
rem ===========================================================================
rem  PONTO DE VIRADA - abre o jogo com dois cliques.
rem
rem  O que ele faz, em ordem: entra na pasta do projeto, instala as
rem  dependencias se elas faltarem, gera o build de arquivo unico da feira
rem  (P8-05) e abre o resultado no navegador padrao.
rem
rem  Reconstroi TODA vez, de proposito: leva uns 5 segundos e evita o pior
rem  cenario de um estande, que e mostrar uma versao velha sem perceber.
rem
rem  As mensagens abaixo nao tem acento de proposito. O console do Windows
rem  abre em codepage 850 ou 437 dependendo da maquina, e acento vira simbolo
rem  trocado - justamente na tela que existe para ser lida por quem travou.
rem ===========================================================================

rem  %~dp0 e a pasta deste arquivo. Sem isto, um duplo clique a partir de um
rem  atalho rodaria com a pasta errada.
cd /d "%~dp0"

echo.
echo  === PONTO DE VIRADA ===
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [ERRO] O Node.js nao esta instalado, ou o terminal foi aberto antes
  echo         da instalacao.
  echo.
  echo         Baixe em https://nodejs.org - versao 22.12 ou mais nova.
  echo         Depois de instalar, feche esta janela e clique aqui de novo.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo  Primeira vez nesta maquina: baixando as dependencias.
  echo  Isso demora alguns minutos, e so acontece uma vez.
  echo.
  call npm ci
  if errorlevel 1 goto erro
  echo.
)

echo  Gerando o arquivo do jogo...
echo.
call npm run build:feira
if errorlevel 1 goto erro

echo.
echo  Pronto. Abrindo no navegador.
echo.
start "" "dist-feira\index.html"
exit /b 0

:erro
echo.
echo  [ERRO] Alguma coisa falhou acima. A mensagem do erro esta no meio do
echo         texto que passou - role para cima para ler.
echo.
pause
exit /b 1
