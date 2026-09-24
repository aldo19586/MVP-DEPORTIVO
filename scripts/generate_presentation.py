import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Color Palette (Dark Sport Luxury)
    BG_COLOR = RGBColor(15, 23, 42)        # Slate 900 #0f172a
    CARD_BG = RGBColor(30, 41, 59)         # Slate 800 #1e293b
    CARD_BORDER = RGBColor(51, 65, 85)     # Slate 700 #334155
    EMERALD = RGBColor(16, 185, 129)       # Emerald 500 #10b981
    EMERALD_LIGHT = RGBColor(52, 211, 153) # Emerald 400 #34d399
    AMBER = RGBColor(245, 158, 11)         # Amber 500 #f59e0b
    TEXT_WHITE = RGBColor(255, 255, 255)
    TEXT_MUTED = RGBColor(148, 163, 184)   # Slate 400 #94a3b8
    PURPLE = RGBColor(168, 85, 247)        # Purple 500 #a855f7
    BLUE = RGBColor(59, 130, 246)          # Blue 500 #3b82f6

    blank_layout = prs.slide_layouts[6]

    def set_slide_bg(slide):
        bg_shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg_shape.fill.solid()
        bg_shape.fill.fore_color.rgb = BG_COLOR
        bg_shape.line.fill.background()
        return bg_shape

    def add_header(slide, title, category="MATCHSPORT PLATFORM"):
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = EMERALD

        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.7), Inches(0.8))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title
        p_title.font.size = Pt(22)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_WHITE

    def add_card(slide, left, top, width, height, title, subtitle, bullets, accent_color=EMERALD):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = CARD_BORDER
        card.line.width = Pt(1.5)

        # Accent indicator bar at the top of the card
        accent = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left + Inches(0.2), top + Inches(0.18), Inches(0.8), Inches(0.06))
        accent.fill.solid()
        accent.fill.fore_color.rgb = accent_color
        accent.line.fill.background()

        tb = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.35), width - Inches(0.4), height - Inches(0.45))
        tf = tb.text_frame
        tf.word_wrap = True

        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(16)
        p_t.font.bold = True
        p_t.font.color.rgb = TEXT_WHITE

        if subtitle:
            p_s = tf.add_paragraph()
            p_s.text = subtitle
            p_s.font.size = Pt(11)
            p_s.font.color.rgb = accent_color
            p_s.space_after = Pt(8)

        for b in bullets:
            p_b = tf.add_paragraph()
            p_b.text = f"• {b}"
            p_b.font.size = Pt(11)
            p_b.font.color.rgb = TEXT_MUTED
            p_b.space_after = Pt(4)

    # -------------------------------------------------------------
    # SLIDE 1: PORTADA EJECUTIVA
    # -------------------------------------------------------------
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s1)

    # Decorative glow card
    glow = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.8), Inches(11.733), Inches(5.9))
    glow.fill.solid()
    glow.fill.fore_color.rgb = CARD_BG
    glow.line.color.rgb = EMERALD
    glow.line.width = Pt(2)

    tb = s1.shapes.add_textbox(Inches(1.5), Inches(1.5), Inches(10.3), Inches(4.5))
    tf = tb.text_frame
    tf.word_wrap = True

    p0 = tf.paragraphs[0]
    p0.text = "⚡ MATCHSPORT PLATFORM"
    p0.font.size = Pt(14)
    p0.font.bold = True
    p0.font.color.rgb = EMERALD
    p0.space_after = Pt(10)

    p1 = tf.add_paragraph()
    p1.text = "Arquitectura Técnica, Desacoplamiento & Plan de Desarrollo"
    p1.font.size = Pt(32)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_WHITE
    p1.space_after = Pt(16)

    p2 = tf.add_paragraph()
    p2.text = "Especificación de Ingeniería para Separación Frontend/Backend y Organización de Equipo (3 Devs + 1 UI/UX & Marketing)"
    p2.font.size = Pt(15)
    p2.font.color.rgb = TEXT_MUTED
    p2.space_after = Pt(28)

    p3 = tf.add_paragraph()
    p3.text = "🚀 Preparado para el Equipo Fundador y Desarrollo Asistido por Agentes IA • Septiembre 2026"
    p3.font.size = Pt(12)
    p3.font.bold = True
    p3.font.color.rgb = AMBER

    # -------------------------------------------------------------
    # SLIDE 2: DIAGNÓSTICO Y VEREDICTO DEL PROTOTIPO
    # -------------------------------------------------------------
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s2)
    add_header(s2, "Diagnóstico: ¿Por qué este prototipo es la base ideal?", "ESTADO ACTUAL & VIABILIDAD")

    add_card(s2, Inches(0.8), Inches(1.6), Inches(3.6), Inches(5.2),
             "1. Lo Difícil Ya Está Resuelto",
             "ALGORITMOS & MATEMÁTICA",
             [
                 "Motor Glicko-2 con Rating, RD y Volatilidad 100% operativo.",
                 "Fórmula de Haversine calibrada con distritos de Lima.",
                 "Ventana dinámica que abre tolerancia (+30 pts cada 5s).",
                 "Modal de aceptación de 20s estilo Dota 2 validado contra estrés.",
                 "Tests automáticos pasando al 100%."
             ], EMERALD)

    add_card(s2, Inches(4.85), Inches(1.6), Inches(3.6), Inches(5.2),
             "2. Identidad & Resiliencia",
             "UX AMATEUR SIN FRICCIÓN",
             [
                 "Acceso ultrarrápido por Nombre + PIN (4 dígitos).",
                 "Criptografía en SQLite con hash unidireccional bcryptjs.",
                 "Grace Period de 25s: si hay microcorte en cancha, no te expulsa.",
                 "Cuestionario de 3 preguntas para calcular ELO inicial.",
                 "25 bots sembrados con GPS en Lima para demos inmediatas."
             ], BLUE)

    add_card(s2, Inches(8.9), Inches(1.6), Inches(3.6), Inches(5.2),
             "3. El Siguiente Paso Natural",
             "DESACOPLAMIENTO PROFESIONAL",
             [
                 "Separar el código en módulos especializados.",
                 "App Móvil para jugadores (Capacitor Android/iOS).",
                 "Web Dashboard para dueños de canchas / admin.",
                 "Backend central con base de datos PostgreSQL.",
                 "Organizar el desarrollo entre los 4 integrantes del equipo."
             ], AMBER)

    # -------------------------------------------------------------
    # SLIDE 3: ESTRUCTURA MONOREPO DESACOPLADA
    # -------------------------------------------------------------
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s3)
    add_header(s3, "Estructura Monorepo: 3 Aplicaciones + 1 Paquete Compartido", "ARQUITECTURA DE SOFTWARE")

    add_card(s3, Inches(0.8), Inches(1.6), Inches(3.6), Inches(5.2),
             "apps/player-mobile",
             "📱 APP MÓVIL DEL JUGADOR",
             [
                 "Tecnología: React 18 + Capacitor 8.",
                 "Despliegue nativo en Android Studio e iOS.",
                 "Interfaz táctil optimizada a 60 FPS.",
                 "Acceso a GPS, Háptica y Notificaciones Push (FCM).",
                 "Barra inferior con 4 iconos clave.",
                 "Cartas FUT coleccionables y chat de sala."
             ], EMERALD)

    add_card(s3, Inches(4.85), Inches(1.6), Inches(3.6), Inches(5.2),
             "apps/backend",
             "⚙️ SERVIDOR CENTRAL & TIEMPO REAL",
             [
                 "Tecnología: Node.js, Express, Socket.IO.",
                 "Arquitectura por capas: Controllers, Services, Repositories.",
                 "Autenticación JWT + hash bcrypt para PIN.",
                 "Socket.IO con Redis Pub/Sub para escala horizontal.",
                 "Persistencia con PostgreSQL (migración desde SQLite).",
                 "Winston Logger estructurado para auditoría."
             ], BLUE)

    add_card(s3, Inches(8.9), Inches(1.6), Inches(3.6), Inches(5.2),
             "apps/admin-web & shared",
             "🖥️ WEB ADMIN + 📦 PAQUETE COMÚN",
             [
                 "admin-web: Dashboard de escritorio panorámico (1080p+).",
                 "Monitor en vivo de sockets y partidos activos.",
                 "Sala de resolución de disputas de marcadores.",
                 "packages/shared: Diccionario estricto de eventos Socket.IO.",
                 "Catálogo unificado de deportes y distritos de Lima."
             ], PURPLE)

    # -------------------------------------------------------------
    # SLIDE 4: PRINCIPIOS DE DISEÑO MÓVIL (ESTILO TIKTOK / UBER)
    # -------------------------------------------------------------
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s4)
    add_header(s4, "Experiencia Móvil de Alta Retención: Principios UI/UX", "DISEÑO CENTRADO EN EL USUARIO")

    add_card(s4, Inches(0.8), Inches(1.6), Inches(3.6), Inches(5.2),
             "La Zona del Pulgar",
             "ERGONOMÍA TÁCTIL (THUMB ZONE)",
             [
                 "El 75% de las personas usan el celular con una sola mano.",
                 "Los botones más importantes van en el tercio inferior de la pantalla.",
                 "Cero estirar la mano hacia la esquina superior para menús.",
                 "El botón 'Buscar Rival' o 'Aceptar' se pulsa cómodamente con el pulgar."
             ], EMERALD)

    add_card(s4, Inches(4.85), Inches(1.6), Inches(3.6), Inches(5.2),
             "Ley de Hick: Cero Botones",
             "MENOS OPCIONES = MÁS VELOCIDAD",
             [
                 "A mayor cantidad de botones, mayor frustración.",
                 "Una pantalla = Una sola acción principal destacada (Primary CTA).",
                 "Cero formularios largos: entrada en 2 taps con Nombre y PIN.",
                 "Navegación visual limpia con animaciones fluidas a 60 FPS."
             ], AMBER)

    add_card(s4, Inches(8.9), Inches(1.6), Inches(3.6), Inches(5.2),
             "Barra Inferior de 4 Iconos",
             "ESTÁNDAR DE ORO (APPLE & GOOGLE)",
             [
                 "🧭 1. JUGAR: Radar y botón central 'Buscar Partido'.",
                 "🏟️ 2. SALAS: Convocatorias abiertas y código PIN para WhatsApp.",
                 "🏆 3. RANKING: Tablas distritales y mejores puntuados.",
                 "👤 4. PERFIL: Tu Carta FUT, 6 atributos y reputación Fair Play."
             ], BLUE)

    # -------------------------------------------------------------
    # SLIDE 5: REPARTO DEL EQUIPO (3 DEVS + 1 UI/UX & MKT)
    # -------------------------------------------------------------
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s5)
    add_header(s5, "Reparto de Roles: 3 Desarrolladores + 1 UI/UX & Marketing", "ORGANIZACIÓN DEL EQUIPO")

    add_card(s5, Inches(0.8), Inches(1.6), Inches(2.7), Inches(5.2),
             "🎨 Miembro 4",
             "UI/UX & MARKETING LEAD",
             [
                 "Design System oficial en Figma.",
                 "Diseño de pantallas móviles (Barra de 4 Iconos).",
                 "Diseño de Cartas FUT (Bronce, Plata, Oro, TOTW).",
                 "Mensajes virales de WhatsApp para compartir salas.",
                 "Alianza con 2 canchas piloto para captar jugadores."
             ], PURPLE)

    add_card(s5, Inches(3.8), Inches(1.6), Inches(2.7), Inches(5.2),
             "⚙️ Dev 1",
             "BACKEND & DB LEAD",
             [
                 "Estructuración de base de datos PostgreSQL.",
                 "Autenticación Nombre + PIN y emisión de JWT.",
                 "Seguridad: Rate Limiting y validación Zod.",
                 "Desarrollo del Panel Web SuperAdmin (desktop).",
                 "Resolución de disputas y métricas en vivo."
             ], BLUE)

    add_card(s5, Inches(6.8), Inches(1.6), Inches(2.7), Inches(5.2),
             "⚡ Dev 2",
             "REAL-TIME ENGINEER",
             [
                 "Arquitectura de eventos en Socket.IO.",
                 "Motor Glicko-2 y distancia por Haversine.",
                 "Expansión dinámica de ventana (+30 pts cada 5s).",
                 "Reconexión resiliente (Grace Period de 25s).",
                 "Configuración de Redis Pub/Sub para alta carga."
             ], EMERALD)

    add_card(s5, Inches(9.8), Inches(1.6), Inches(2.7), Inches(5.2),
             "📱 Dev 3",
             "MOBILE FRONTEND LEAD",
             [
                 "Maquetación fiel de los diseños Figma en React.",
                 "Implementación de la Barra de 4 Iconos y transiciones.",
                 "Conexión de eventos Socket.IO y modales.",
                 "Capacitor nativo: Vibración háptica, GPS y Push FCM.",
                 "Compilación y optimización en Android Studio."
             ], AMBER)

    # -------------------------------------------------------------
    # SLIDE 6: CRONOGRAMA ÁGIL (SPRINT DE 3 SEMANAS)
    # -------------------------------------------------------------
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s6)
    add_header(s6, "Plan de Ejecución Ágil: Sprint de 3 Semanas", "HOJA DE RUTA OPERATIVA")

    add_card(s6, Inches(0.8), Inches(1.6), Inches(3.6), Inches(5.2),
             "Semana 1: Cimientos",
             "DISEÑO, CONTRATOS & BASE",
             [
                 "Miembro 4: Entrega Figma de los 4 tabs y la carta FUT.",
                 "Dev 1 & Dev 2: Definen contratos de API REST y eventos Socket.IO.",
                 "Dev 3: Configura el entorno Capacitor en Android y navegación base.",
                 "Hito: Contratos estandarizados en packages/shared sin errores."
             ], BLUE)

    add_card(s6, Inches(4.85), Inches(1.6), Inches(3.6), Inches(5.2),
             "Semana 2: Construcción",
             "LOGICA PURA & PANTALLAS",
             [
                 "Miembro 4: Diseña copy de WhatsApp y contacta 2 canchas piloto.",
                 "Dev 1: Implementa Auth por PIN + JWT y endpoints de partidos.",
                 "Dev 2: Conecta flujo de salas (Lobbies) y modal de 20s.",
                 "Dev 3: Maqueta las vistas de Salas y Radar con base en Figma.",
                 "Hito: Partidos de prueba entre celulares en red local."
             ], AMBER)

    add_card(s6, Inches(8.9), Inches(1.6), Inches(3.6), Inches(5.2),
             "Semana 3: Integración",
             "PRUEBAS EN CANCHA & ADMIN",
             [
                 "Miembro 4: Prueba de usabilidad con 5 amigos en una cancha real.",
                 "Dev 1: Monta el Panel Web Admin con métricas en vivo.",
                 "Dev 2: Calibra el reporte de resultados y penalización anti-ausentismo.",
                 "Dev 3: Conexión final con plugins de háptica y Push.",
                 "Hito: MVP en producción listo para invitar a los primeros 200 usuarios."
             ], EMERALD)

    # -------------------------------------------------------------
    # SLIDE 7: CIERRE Y CONCLUSIÓN ESTRATÉGICA
    # -------------------------------------------------------------
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_bg(s7)

    c_close = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.2), Inches(10.933), Inches(5.1))
    c_close.fill.solid()
    c_close.fill.fore_color.rgb = CARD_BG
    c_close.line.color.rgb = EMERALD
    c_close.line.width = Pt(2)

    tb_c = s7.shapes.add_textbox(Inches(1.8), Inches(1.7), Inches(9.7), Inches(4.1))
    tf_c = tb_c.text_frame
    tf_c.word_wrap = True

    pc0 = tf_c.paragraphs[0]
    pc0.text = "🎯 CONCLUSIÓN Y PRÓXIMOS PASOS"
    pc0.font.size = Pt(13)
    pc0.font.bold = True
    pc0.font.color.rgb = EMERALD
    pc0.space_after = Pt(12)

    pc1 = tf_c.add_paragraph()
    pc1.text = "Tenemos la base técnica resuelta; ahora ejecutamos la experiencia de usuario definitiva."
    pc1.font.size = Pt(26)
    pc1.font.bold = True
    pc1.font.color.rgb = TEXT_WHITE
    pc1.space_after = Pt(18)

    points = [
        "1. No empezamos de cero: Los algoritmos más complejos (Glicko-2, Haversine, PIN bcrypt, 20s accept) ya están probados con tests.",
        "2. Roles definidos: Cada integrante tiene una misión clara, sin solapamientos ni fricción.",
        "3. Estándar de producto: App móvil rápida estilo TikTok (Thumb Zone + 4 tabs) y Web Admin potente.",
        "4. El Agente de IA ya cuenta con los contratos, especificaciones y guías para asistir en cada sprint."
    ]
    for pt in points:
        p_pt = tf_c.add_paragraph()
        p_pt.text = pt
        p_pt.font.size = Pt(13)
        p_pt.font.color.rgb = TEXT_MUTED
        p_pt.space_after = Pt(8)

    output_path = "PRESENTACION_ARQUITECTURA_MATCHSPORT.pptx"
    prs.save(output_path)
    print(f"[OK] Presentacion guardada exitosamente en {output_path}")

if __name__ == "__main__":
    create_presentation()
