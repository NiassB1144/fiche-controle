from django import template

register = template.Library()

ICONS = {
    1: 'building',
    2: 'clipboard-check',
    3: 'file-earmark-person',
    4: 'clock',
    5: 'shield-check',
    6: 'pen-fill',
}

@register.filter
def section_icon(etape):
    try:
        return ICONS.get(int(etape), 'circle')
    except (TypeError, ValueError):
        return 'circle'
