# 6. Monitoring & Alerting

[← Selector maintenance index](index.md)

## 6.1 Slack/Discord Alerts

Configure webhook for immediate notification:

```yaml
# In selector-health workflow
- name: Notify on Failure
  if: failure()
  run: |
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d '{
        "text": "🚨 Selector Health Check Failed",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Selector breakage detected!*\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Workflow>"
            }
          }
        ]
      }'
```

## 6.2 PagerDuty Integration (Optional)

For production incidents, trigger PagerDuty:

```yaml
- name: Trigger PagerDuty
  if: failure()
  run: |
    curl -X POST "https://events.pagerduty.com/v2/enqueue" \
      -H 'Content-Type: application/json' \
      -d '{
        "routing_key": "${{ secrets.PAGERDUTY_ROUTING_KEY }}",
        "event_action": "trigger",
        "payload": {
          "summary": "AI Leak Checker selector breakage",
          "severity": "critical",
          "source": "GitHub Actions"
        }
      }'
```
