#!/bin/bash

# Скрипт для установки whisper.cpp и ffmpeg

# Функция для установки ffmpeg
install_ffmpeg() {
  echo "Установка ffmpeg..."

  if command -v brew > /dev/null 2>&1; then
    # macOS
    brew install ffmpeg
    if [ $? -eq 0 ]; then
      echo "ffmpeg успешно установлен через Homebrew."
    else
      echo "Ошибка при установке ffmpeg через Homebrew."
      return 1
    fi
  elif command -v apt-get > /dev/null 2>&1; then
    # Debian/Ubuntu
    sudo apt-get update
    sudo apt-get install -y ffmpeg
    if [ $? -eq 0 ]; then
      echo "ffmpeg успешно установлен через apt-get."
    else
      echo "Ошибка при установке ffmpeg через apt-get."
      return 1
    fi
  else
    echo "Не удалось определить систему управления пакетами.  Пожалуйста, установите ffmpeg вручную."
    return 1
  fi

  return 0
}

# Функция для установки whisper.cpp
install_whisper_cpp() {
  echo "Установка whisper.cpp..."

  # Проверяем наличие git
  if ! command -v git > /dev/null 2>&1; then
    echo "git не установлен. Пожалуйста, установите git перед продолжением."
    return 1
  fi

  # Клонируем репозиторий whisper.cpp
  if [ ! -d "whisper.cpp" ]; then
    git clone https://github.com/ggerganov/whisper.cpp
    if [ $? -ne 0 ]; then
      echo "Ошибка при клонировании репозитория whisper.cpp."
      return 1
    fi
  fi

  # Переходим в каталог whisper.cpp
  cd whisper.cpp

  # Устанавливаем зависимости (зависит от ОС)
  if command -v brew > /dev/null 2>&1; then
    # macOS
    brew install cmake
    if [ $? -ne 0 ]; then
      echo "Ошибка при установке cmake через Homebrew."
      return 1
    fi
  elif command -v apt-get > /dev/null 2>&1; then
    # Debian/Ubuntu
    sudo apt-get update
    sudo apt-get install -y build-essential cmake
    if [ $? -ne 0 ]; then
      echo "Ошибка при установке build-essential и cmake через apt-get."
      return 1
    fi
  else
    echo "Не удалось определить систему управления пакетами. Пожалуйста, установите cmake и build-essential вручную."
    return 1
  fi

  # Собираем whisper.cpp
  make
  if [ $? -ne 0 ]; then
    echo "Ошибка при сборке whisper.cpp."
    return 1
  fi

  echo "whisper.cpp успешно установлен и собран."
  cd .. # Возвращаемся в исходный каталог
  return 0
}


# Главная часть скрипта
echo "Начинаем установку..."

# Устанавливаем ffmpeg
if install_ffmpeg; then
  echo "ffmpeg успешно установлен."
else
  echo "Установка ffmpeg не удалась. Скрипт завершается."
  exit 1
fi

# Устанавливаем whisper.cpp
if install_whisper_cpp; then
  echo "whisper.cpp успешно установлен."
else
  echo "Установка whisper.cpp не удалась. Скрипт завершается."
  exit 1
fi

echo "Установка завершена. whisper.cpp и ffmpeg установлены."
exit 0