export const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/[*_`]/g, '')
}

export const formatInlineMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

export const isBulletPoint = (line: string): boolean => {
  return line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)
}

export const removeBulletMarker = (line: string): string => {
  if (line.startsWith('- ') || line.startsWith('* ')) {
    return line.slice(2)
  }
  if (/^\d+\.\s/.test(line)) {
    return line.replace(/^\d+\.\s/, '')
  }
  return line
}

export const removeLeadingEmoji = (text: string): string => {
  const emojiPattern = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/u
  return text.replace(emojiPattern, '')
}

