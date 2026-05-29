const SUMMARY_MAX_LENGTH = 80

export const summarizeItems = async <T extends { summary: string }>(items: T[]) => {
  return items.map((item) => ({
    ...item,
    summary: item.summary.slice(0, SUMMARY_MAX_LENGTH)
  }))
}
