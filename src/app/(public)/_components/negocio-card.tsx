"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/ui/components/badge";
import { Card, CardContent } from "@/ui/components/card";
import { MapPin as MapPinIcon } from "lucide-react";

function WhatsAppIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.347-.347.52-.52.174-.174.232-.298.348-.497.116-.198.058-.372-.058-.52-.116-.15-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export interface NegocioCardProps {
  negocio: {
    id: string;
    slug: string;
    nome: string;
    descricao: string;
    categorias: Array<{ id: string; nome: string; slug: string }>;
    contatos: Array<{ tipo: string; valor: string; ordem: number }>;
    localizacao: {
      bairro: string | null;
      areaAtendimento: string | null;
    } | null;
    abertoAgora: "aberto" | "fechado" | "sem_horario";
  };
}

export function NegocioCard({ negocio }: NegocioCardProps) {
  const router = useRouter();

  const primeiroContato = negocio.contatos[0];
  const telefoneFormatado = primeiroContato
    ? primeiroContato.valor.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3")
    : null;

  const handleCardClick = () => {
    router.push(`/negocio/${negocio.slug}`);
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!telefoneFormatado) return;
    window.open(
      `https://wa.me/55${telefoneFormatado.replace(/\D/g, "")}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <article
      onClick={handleCardClick}
      className="group cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="aspect-[4/3] bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
            {negocio.categorias.slice(0, 3).map((cat) => (
              <Badge
                key={cat.id}
                variant="secondary"
                className="text-xs px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm"
              >
                {cat.nome}
              </Badge>
            ))}
            {negocio.categorias.length > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-1">
                +{negocio.categorias.length - 3}
              </Badge>
            )}
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors line-clamp-1">
                {negocio.nome}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                {negocio.descricao}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {negocio.abertoAgora === "aberto" && (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Aberto
                </span>
              )}
              {negocio.abertoAgora === "fechado" && (
                <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Fechado
                </span>
              )}
              {negocio.abertoAgora === "sem_horario" && (
                <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <MapPinIcon className="h-3 w-3" />
                  Sem horário
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {negocio.localizacao?.bairro && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="h-3.5 w-3.5" />
                <span>{negocio.localizacao.bairro}</span>
              </span>
            )}
            {telefoneFormatado && (
              <button
                onClick={handleWhatsAppClick}
                className="flex items-center gap-1 hover:text-primary transition-colors"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon />
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </article>
  );
}
